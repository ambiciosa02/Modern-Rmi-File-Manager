package shared;

import java.rmi.Remote;
import java.rmi.RemoteException;
import java.util.List;

public interface FileInterface extends Remote {
    // File operations
    boolean uploadFile(String filename, byte[] data) throws RemoteException;
    boolean uploadFileToFolder(String folderPath, String filename, byte[] data) throws RemoteException;
    byte[] downloadFile(String filepath) throws RemoteException;
    List<FileMetadata> listFilesExtended() throws RemoteException;
    List<FileMetadata> listFolderContents(String folderPath) throws RemoteException;
    boolean deleteFile(String filepath) throws RemoteException;
    
    // Folder operations
    boolean createFolder(String folderPath) throws RemoteException;
    boolean deleteFolder(String folderPath) throws RemoteException;
    List<String> listFolders() throws RemoteException;
    boolean folderExists(String folderPath) throws RemoteException;
}
