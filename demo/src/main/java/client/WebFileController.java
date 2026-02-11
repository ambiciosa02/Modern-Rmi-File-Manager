package client;

import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpSession;
import shared.FileInterface;
import shared.FileMetadata;  // ADD THIS IMPORT

@Controller
public class WebFileController {

    private FileInterface getStub() throws Exception {
        try {
            System.out.println("Attempting to connect to RMI registry at localhost:1099...");
            Registry registry = LocateRegistry.getRegistry("localhost", 1099);
            System.out.println("Registry found, looking up 'FileService'...");
            FileInterface stub = (FileInterface) registry.lookup("FileService");
            System.out.println("RMI connection successful!");
            return stub;
        } catch (Exception e) {
            System.err.println("RMI Connection failed: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @GetMapping("/")
    public String index(Model model, @RequestParam(value = "folder", defaultValue = "") String folder,
            HttpSession session) {  // ADD HttpSession parameter

        // ===== ADD LOGIN CHECK =====
        Boolean isLoggedIn = (Boolean) session.getAttribute("isLoggedIn");
        if (isLoggedIn == null || !isLoggedIn) {
            System.out.println("User not logged in, redirecting to login...");
            return "redirect:/login.html";
        }
        // ===== END LOGIN CHECK =====

        try {
            List<FileMetadata> files = getStub().listFolderContents(folder);

            // Add parent folder entry if we're in a subfolder
            if (!folder.isEmpty()) {
                String parentPath = getParentPath(folder);
                FileMetadata parentFolder = new FileMetadata(
                        "..",
                        parentPath,
                        0,
                        System.currentTimeMillis(),
                        true
                );
                files.add(0, parentFolder);
            }

            model.addAttribute("files", files);
            model.addAttribute("currentFolder", folder);
            model.addAttribute("breadcrumbs", getBreadcrumbs(folder));

        } catch (Exception e) {
            System.err.println("Error loading index: " + e.getMessage());
            e.printStackTrace();
            model.addAttribute("error", "Cannot connect to file server: " + e.getMessage());
        }
        return "index";
    }

    @GetMapping("/api/files")
    @ResponseBody
    public ResponseEntity<?> getFiles(@RequestParam(value = "folder", defaultValue = "") String folder) {
        try {
            List<FileMetadata> files = getStub().listFolderContents(folder);

            // Add parent folder entry if we're in a subfolder
            if (!folder.isEmpty()) {
                String parentPath = getParentPath(folder);
                FileMetadata parentFolder = new FileMetadata(
                        "..",
                        parentPath,
                        0,
                        System.currentTimeMillis(),
                        true
                );
                files.add(0, parentFolder);
            }

            System.out.println("API: Returning " + files.size() + " files from folder: "
                    + (folder.isEmpty() ? "root" : folder));

            return ResponseEntity.ok(files);

        } catch (Exception e) {
            System.err.println("API Error: " + e.getMessage());
            e.printStackTrace();

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to get files: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/upload")
    @ResponseBody
    public ResponseEntity<?> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "") String folder) {

        System.out.println("Upload request: file=" + file.getOriginalFilename()
                + ", folder=" + (folder.isEmpty() ? "root" : folder));

        try {
            if (file.isEmpty()) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "File is empty");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            boolean success = getStub().uploadFileToFolder(folder, file.getOriginalFilename(), file.getBytes());

            if (success) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "File uploaded successfully");
                response.put("filename", file.getOriginalFilename());
                response.put("folder", folder);
                return ResponseEntity.ok(response);
            } else {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "Failed to upload file");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }

        } catch (Exception e) {
            System.err.println("Upload error: " + e.getMessage());
            e.printStackTrace();

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Upload failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/download/{filename:.+}")
    public ResponseEntity<byte[]> download(
            @PathVariable String filename,
            @RequestParam(value = "folder", defaultValue = "") String folder) {

        System.out.println("Download request: file=" + filename
                + ", folder=" + (folder.isEmpty() ? "root" : folder));

        try {
            String filepath = folder.isEmpty() ? filename : folder + "/" + filename;
            byte[] data = getStub().downloadFile(filepath);

            if (data == null) {
                System.err.println("File not found: " + filepath);
                return ResponseEntity.notFound().build();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
            headers.add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_OCTET_STREAM_VALUE);
            headers.add(HttpHeaders.CONTENT_LENGTH, String.valueOf(data.length));

            System.out.println("Download successful: " + filename + " (" + data.length + " bytes)");
            return new ResponseEntity<>(data, headers, HttpStatus.OK);

        } catch (Exception e) {
            System.err.println("Download error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/delete/{filename:.+}")
    @ResponseBody
    public ResponseEntity<?> delete(
            @PathVariable String filename,
            @RequestParam(value = "folder", defaultValue = "") String folder) {

        System.out.println("Delete request: file=" + filename
                + ", folder=" + (folder.isEmpty() ? "root" : folder));

        try {
            String filepath = folder.isEmpty() ? filename : folder + "/" + filename;
            boolean success = getStub().deleteFile(filepath);

            if (success) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "File deleted successfully");
                response.put("filename", filename);
                return ResponseEntity.ok(response);
            } else {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "Failed to delete file");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }

        } catch (Exception e) {
            System.err.println("Delete error: " + e.getMessage());
            e.printStackTrace();

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Delete failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/api/folders")
    @ResponseBody
    public ResponseEntity<?> createFolder(@RequestParam("name") String folderName,
            @RequestParam(value = "parent", defaultValue = "") String parentFolder) {

        System.out.println("Create folder: name=" + folderName
                + ", parent=" + (parentFolder.isEmpty() ? "root" : parentFolder));

        try {
            if (folderName == null || folderName.trim().isEmpty()) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "Folder name cannot be empty");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            folderName = folderName.trim();
            String folderPath = parentFolder.isEmpty() ? folderName : parentFolder + "/" + folderName;

            boolean success = getStub().createFolder(folderPath);

            if (success) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Folder created successfully");
                response.put("path", folderPath);
                return ResponseEntity.ok(response);
            } else {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "Failed to create folder (might already exist)");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }

        } catch (Exception e) {
            System.err.println("Create folder error: " + e.getMessage());
            e.printStackTrace();

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to create folder: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/api/folders")
    @ResponseBody
    public ResponseEntity<?> listFolders() {
        try {
            List<String> folders = getStub().listFolders();
            return ResponseEntity.ok(folders);
        } catch (Exception e) {
            System.err.println("List folders error: " + e.getMessage());

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to list folders: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/api/storage")
    @ResponseBody
    public ResponseEntity<?> getStorageInfo(@RequestParam(value = "folder", defaultValue = "") String folder) {
        try {
            List<FileMetadata> files = getStub().listFolderContents(folder);
            long totalSize = 0;
            int fileCount = 0;
            int folderCount = 0;

            for (FileMetadata file : files) {
                if (file.isDirectory()) {
                    if (!file.getName().equals("..")) { // Don't count parent folder
                        folderCount++;
                    }
                } else {
                    totalSize += file.getSize();
                    fileCount++;
                }
            }

            Map<String, Object> storageInfo = new HashMap<>();
            storageInfo.put("totalSize", totalSize);
            storageInfo.put("fileCount", fileCount);
            storageInfo.put("folderCount", folderCount);
            storageInfo.put("usedSpace", totalSize);
            storageInfo.put("totalSpace", 10L * 1024 * 1024 * 1024); // 10 GB

            System.out.println("Storage info: " + fileCount + " files, "
                    + folderCount + " folders, " + totalSize + " bytes");

            return ResponseEntity.ok(storageInfo);

        } catch (Exception e) {
            System.err.println("Storage info error: " + e.getMessage());

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to get storage info: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/api/delete-folder")
    @ResponseBody
    public ResponseEntity<?> deleteFolder(@RequestParam("path") String folderPath) {

        System.out.println("Delete folder request: path=" + folderPath);

        try {
            boolean success = getStub().deleteFolder(folderPath);

            if (success) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Folder deleted successfully");
                response.put("path", folderPath);
                return ResponseEntity.ok(response);
            } else {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", "Failed to delete folder");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }

        } catch (Exception e) {
            System.err.println("Delete folder error: " + e.getMessage());
            e.printStackTrace();

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to delete folder: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // Helper methods
    private String getParentPath(String currentPath) {
        if (currentPath == null || currentPath.isEmpty() || !currentPath.contains("/")) {
            return "";
        }
        int lastSlash = currentPath.lastIndexOf("/");
        return currentPath.substring(0, lastSlash);
    }

    private List<Map<String, String>> getBreadcrumbs(String currentPath) {
        List<Map<String, String>> breadcrumbs = new ArrayList<>();

        // Add root breadcrumb
        Map<String, String> root = new HashMap<>();
        root.put("name", "Home");
        root.put("path", "");
        breadcrumbs.add(root);

        if (currentPath != null && !currentPath.isEmpty()) {
            String[] parts = currentPath.split("/");
            StringBuilder pathBuilder = new StringBuilder();

            for (String part : parts) {
                if (!part.isEmpty()) {
                    if (pathBuilder.length() > 0) {
                        pathBuilder.append("/");
                    }
                    pathBuilder.append(part);

                    Map<String, String> crumb = new HashMap<>();
                    crumb.put("name", part);
                    crumb.put("path", pathBuilder.toString());
                    breadcrumbs.add(crumb);
                }
            }
        }

        return breadcrumbs;
    }
}
