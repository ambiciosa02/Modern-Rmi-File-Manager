package shared;

import java.io.Serializable;

public class FileMetadata implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private String name;
    private String path;
    private long size;
    private long lastModified;
    private boolean isDirectory;

    // Default constructor for serialization
    public FileMetadata() {
    }

    // Constructor for files/folders
    public FileMetadata(String name, String path, long size, long lastModified, boolean isDirectory) {
        this.name = name;
        this.path = path;
        this.size = size;
        this.lastModified = lastModified;
        this.isDirectory = isDirectory;
    }

    // Backward compatible constructor
    public FileMetadata(String name, long size, long lastModified) {
        this(name, name, size, lastModified, false);
    }

    // Getters and Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public long getSize() {
        return size;
    }

    public void setSize(long size) {
        this.size = size;
    }

    public long getLastModified() {
        return lastModified;
    }

    public void setLastModified(long lastModified) {
        this.lastModified = lastModified;
    }

    public boolean isDirectory() {
        return isDirectory;
    }

    public boolean getIsDirectory() {
        return isDirectory;
    }

    public void setDirectory(boolean directory) {
        isDirectory = directory;
    }

    @Override
    public String toString() {
        return "FileMetadata{" +
                "name='" + name + '\'' +
                ", path='" + path + '\'' +
                ", size=" + size +
                ", lastModified=" + lastModified +
                ", isDirectory=" + isDirectory +
                '}';
    }
}
