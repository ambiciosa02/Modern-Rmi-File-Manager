package server;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.BasicFileAttributes;
import java.rmi.RemoteException;
import java.rmi.server.UnicastRemoteObject;
import java.util.ArrayList;
import java.util.List;

import shared.FileInterface;
import shared.FileMetadata;

public class FileImpl extends UnicastRemoteObject implements FileInterface {
    private final String STORAGE_PATH = "server_storage/";

    public FileImpl() throws RemoteException {
        super();
        File directory = new File(STORAGE_PATH);
        if (!directory.exists()) {
            directory.mkdir();
        }
    }

    @Override
    public boolean uploadFile(String filename, byte[] data) throws RemoteException {
        return uploadFileToFolder("", filename, data);
    }

    @Override
    public boolean uploadFileToFolder(String folderPath, String filename, byte[] data) throws RemoteException {
        try {
            // Sanitize inputs
            String safeFolderPath = sanitizePath(folderPath);
            String safeFilename = sanitizeFilename(filename);
            
            // Create full path
            String fullPath = STORAGE_PATH;
            if (!safeFolderPath.isEmpty()) {
                fullPath += safeFolderPath + "/";
                // Create folder if it doesn't exist
                File folder = new File(STORAGE_PATH + safeFolderPath);
                if (!folder.exists()) {
                    folder.mkdirs();
                }
            }
            fullPath += safeFilename;
            
            // Write file
            Files.write(Paths.get(fullPath), data);
            System.out.println("✓ Uploaded: " + safeFilename + " to " + 
                             (safeFolderPath.isEmpty() ? "root" : safeFolderPath));
            return true;
        } catch (IOException e) {
            System.err.println("✗ Upload failed: " + filename + " - " + e.getMessage());
            return false;
        }
    }

    @Override
    public byte[] downloadFile(String filepath) throws RemoteException {
        try {
            String safePath = sanitizePath(filepath);
            Path path = Paths.get(STORAGE_PATH + safePath);
            
            if (!Files.exists(path)) {
                System.err.println("✗ File not found: " + safePath);
                return null;
            }
            
            return Files.readAllBytes(path);
        } catch (IOException e) {
            System.err.println("✗ Download failed: " + filepath + " - " + e.getMessage());
            return null;
        }
    }

    @Override
    public List<FileMetadata> listFilesExtended() throws RemoteException {
        return listFolderContents("");
    }

    @Override
    public List<FileMetadata> listFolderContents(String folderPath) throws RemoteException {
        List<FileMetadata> fileList = new ArrayList<>();
        String safePath = sanitizePath(folderPath);
        File folder = new File(STORAGE_PATH + safePath);
        
        // If folder doesn't exist, return empty list
        if (!folder.exists() || !folder.isDirectory()) {
            System.err.println("✗ Folder doesn't exist: " + safePath);
            return fileList;
        }
        
        File[] files = folder.listFiles();
        if (files != null) {
            for (File file : files) {
                try {
                    Path filePath = file.toPath();
                    BasicFileAttributes attrs = Files.readAttributes(filePath, BasicFileAttributes.class);
                    long lastModified = attrs.lastModifiedTime().toMillis();
                    
                    // Create relative path from storage root
                    String relativePath = file.getAbsolutePath()
                        .substring(new File(STORAGE_PATH).getAbsolutePath().length())
                        .replace("\\", "/");
                    if (relativePath.startsWith("/")) {
                        relativePath = relativePath.substring(1);
                    }
                    
                    FileMetadata metadata = new FileMetadata(
                        file.getName(),
                        relativePath,
                        file.length(),
                        lastModified,
                        file.isDirectory()
                    );
                    
                    fileList.add(metadata);
                    
                } catch (IOException e) {
                    System.err.println("✗ Error reading file: " + file.getName() + " - " + e.getMessage());
                    // Fallback to basic file info
                    FileMetadata metadata = new FileMetadata(
                        file.getName(),
                        file.getAbsolutePath().substring(STORAGE_PATH.length()),
                        file.length(),
                        file.lastModified(),
                        file.isDirectory()
                    );
                    fileList.add(metadata);
                }
            }
        }
        
        System.out.println("✓ Listed " + fileList.size() + " items from: " + 
                         (safePath.isEmpty() ? "root" : safePath));
        return fileList;
    }

    @Override
    public boolean deleteFile(String filepath) throws RemoteException {
        String safePath = sanitizePath(filepath);
        File file = new File(STORAGE_PATH + safePath);
        
        if (file.exists()) {
            boolean deleted = file.delete();
            if (deleted) {
                System.out.println("✓ Deleted: " + safePath);
            } else {
                System.err.println("✗ Failed to delete: " + safePath);
            }
            return deleted;
        }
        
        System.err.println("✗ File not found for deletion: " + safePath);
        return false;
    }

    @Override
    public boolean createFolder(String folderPath) throws RemoteException {
        try {
            String safePath = sanitizePath(folderPath);
            File folder = new File(STORAGE_PATH + safePath);
            
            if (folder.exists()) {
                // If it exists and is a directory, return true
                // If it exists but is a file, return false
                return folder.isDirectory();
            }
            
            boolean created = folder.mkdirs();
            if (created) {
                System.out.println("✓ Created folder: " + safePath);
            } else {
                System.err.println("✗ Failed to create folder: " + safePath);
            }
            return created;
        } catch (Exception e) {
            System.err.println("✗ Error creating folder: " + folderPath + " - " + e.getMessage());
            return false;
        }
    }

    @Override
    public boolean deleteFolder(String folderPath) throws RemoteException {
        String safePath = sanitizePath(folderPath);
        File folder = new File(STORAGE_PATH + safePath);
        
        if (!folder.exists() || !folder.isDirectory()) {
            System.err.println("✗ Folder doesn't exist: " + safePath);
            return false;
        }
        
        try {
            deleteFolderRecursive(folder);
            System.out.println("✓ Deleted folder: " + safePath);
            return true;
        } catch (IOException e) {
            System.err.println("✗ Failed to delete folder: " + safePath + " - " + e.getMessage());
            return false;
        }
    }

    @Override
    public List<String> listFolders() throws RemoteException {
        List<String> folders = new ArrayList<>();
        try {
            Files.walk(Paths.get(STORAGE_PATH), 1)
                .filter(Files::isDirectory)
                .skip(1) // Skip the root directory itself
                .forEach(path -> {
                    String relativePath = path.toString()
                        .substring(STORAGE_PATH.length())
                        .replace("\\", "/");
                    if (!relativePath.isEmpty()) {
                        folders.add(relativePath);
                    }
                });
        } catch (IOException e) {
            System.err.println("✗ Error listing folders: " + e.getMessage());
        }
        return folders;
    }

    @Override
    public boolean folderExists(String folderPath) throws RemoteException {
        String safePath = sanitizePath(folderPath);
        File folder = new File(STORAGE_PATH + safePath);
        return folder.exists() && folder.isDirectory();
    }

    // Helper methods
    
    private String sanitizePath(String path) {
        if (path == null || path.trim().isEmpty()) {
            return "";
        }
        
        // Replace backslashes with forward slashes
        path = path.replace("\\", "/");
        
        // Remove leading/trailing slashes
        path = path.replaceAll("^/+|/+$", "");
        
        // Remove any directory traversal attempts
        path = path.replace("..", "");
        
        return path;
    }
    
    private String sanitizeFilename(String filename) {
        if (filename == null || filename.trim().isEmpty()) {
            return "unnamed_" + System.currentTimeMillis();
        }
        
        // Extract just the filename from path
        filename = filename.replace("\\", "/");
        int lastSlash = filename.lastIndexOf("/");
        if (lastSlash != -1) {
            filename = filename.substring(lastSlash + 1);
        }
        
        // Remove problematic characters
        filename = filename.replaceAll("[\\\\/:*?\"<>|]", "_");
        
        // Ensure filename is not empty
        if (filename.isEmpty()) {
            return "unnamed_" + System.currentTimeMillis();
        }
        
        return filename;
    }
    
    private void deleteFolderRecursive(File folder) throws IOException {
        if (folder.isDirectory()) {
            File[] files = folder.listFiles();
            if (files != null) {
                for (File file : files) {
                    deleteFolderRecursive(file);
                }
            }
        }
        
        if (!folder.delete()) {
            throw new IOException("Failed to delete: " + folder.getAbsolutePath());
        }
    }
}
