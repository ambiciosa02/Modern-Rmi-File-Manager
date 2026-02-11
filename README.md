[file name]: README.md
[file content begin]
# Modern File Management System

A beautiful, responsive file management system built with Spring Boot, RMI, and modern web technologies.

## Features

### 🎨 Beautiful Interface
- Clean, modern design with glassmorphism effects
- Responsive sidebar navigation
- Multiple view modes (Grid, List, Details)
- Color-coded file types
- Smooth animations and transitions

### 📂 File Operations
- Create: New folders with modal dialog
- Upload: Drag & drop or browse files
- Delete: Move to trash with confirmation
- Rename: In-place file renaming
- Download: Batch download support
- Share: File sharing functionality

### 🎯 Advanced Features
- **Multi-selection**: Ctrl+Click, Shift+Click, Ctrl+A
- **Drag & Drop**: Visual drop zone with progress indicator
- **Context Menu**: Right-click for quick actions
- **Search & Filter**: Real-time search and filtering
- **Storage Monitoring**: Visual storage usage bar
- **Keyboard Shortcuts**: Ctrl+A, Delete, F2, Esc

### 📱 Responsive Design
- Mobile-friendly sidebar (toggleable)
- Adaptive grid layout
- Touch-friendly buttons
- Optimized for all screen sizes

## Technology Stack

### Backend
- **Spring Boot 3.2.0**: Java backend framework
- **Java RMI**: Remote Method Invocation for file operations
- **Thymeleaf**: Server-side template engine

### Frontend
- **Pure HTML/CSS/JS**: No external dependencies
- **Font Awesome**: Icon library
- **Inter Font**: Modern typography
- **LocalStorage**: For user preferences

### File Types Support
- 📁 **Folders**: Yellow icons
- 📄 **Documents**: Blue icons (Word, Excel, PPT)
- 🎨 **Images**: Purple icons
- 🎬 **Videos**: Orange icons
- 🎵 **Audio**: Teal icons
- 📊 **PDF**: Red icons
- 💾 **Archives**: Dark gray icons
- 💻 **Code**: Yellow icons

## Installation & Setup

### Prerequisites
- Java 17 or higher
- Maven 3.6 or higher

### Steps

1. **Clone and build the project:**
   ```bash
   mvn clean install