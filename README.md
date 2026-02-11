[file name]: README.md
[file content begin]
# Modern File Management System

A distributed file management system featuring a modern Glassmorphism web interface. This project uses **Java RMI** for the file system backend and **Spring Boot** for the web frontend.

## ✨ Features
* **Modern UI:** Responsive design with glass effects and dark mode aesthetics.
* **File Operations:** Upload, download, delete, and rename files.
* **Folder Management:** Create and navigate through directory structures.
* **Visual Feedback:** Storage usage monitoring and file type-specific icons.
* **Authentication:** Simple session-based login system.

## 🛠️ Tech Stack
* **Backend:** Java 17, Spring Boot 3.5.9
* **Distributed Logic:** Java RMI (Remote Method Invocation)
* **Frontend:** HTML5, CSS, JavaScript 
* **Build Tool:** Maven

## 🚀 How to Run

### 1. Start the File Server (RMI)
The server handles the actual file storage and RMI registry.
* Run `server.FileServer.java` from your IDE.
* The server will start on port `1099`.

### 2. Start the Web Application (Client)
The web app provides the user interface.
* Run `client.WebApplication.java` or use Maven:
    ```bash
    mvn spring-boot:run
    ```
* The web interface will be available at: `http://localhost:8081`

### 🔑 Default Login
* **Email:** `user@gmail.com`
* **Password:** `123`

## 📁 Project Structure
* `src/main/java/shared`: RMI Interfaces and Metadata.
* `src/main/java/server`: RMI Server Implementation.
* `src/main/java/client`: Spring Boot Controllers and Config.
* `src/main/resources/static`: CSS and JavaScript files.
* `src/main/resources/templates`: HTML files.

   ```bash
   mvn clean install
