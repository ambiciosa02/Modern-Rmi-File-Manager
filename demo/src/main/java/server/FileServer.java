package server;

import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;

import shared.FileInterface;

public class FileServer {
    public static void main(String[] args) {
        try {
            FileInterface fileService = new FileImpl();
            
            // Create registry on port 1099
            Registry registry = LocateRegistry.createRegistry(1099);
            
            // Bind the remote object's stub in the registry
            registry.rebind("FileService", fileService);
            
            System.out.println(">>> File Server is ready on port 1099.");
            System.out.println(">>> Storage directory: server_storage/");
        } catch (Exception e) {
            System.err.println("Server exception: " + e.toString());
            e.printStackTrace();
        }
    }
}