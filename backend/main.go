package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/atotto/clipboard"
)

type FileNode struct {
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	IsDir    bool        `json:"isDir"`
	Children []*FileNode `json:"children,omitempty"`
}

func main() {
	http.HandleFunc("/api/tree", handleTree)
	http.HandleFunc("/api/file", handleFile)
	fmt.Println("🌲 Go сервер запущен на http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}

func handleTree(w http.ResponseWriter, r *http.Request) {
	root := r.URL.Query().Get("root")
	if root == "" {
		http.Error(w, "Параметр root обязателен", http.StatusBadRequest)
		return
	}
	tree, err := buildTree(root)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(tree)
}

func handleFile(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "Параметр path обязателен", http.StatusBadRequest)
		return
	}
	data, err := os.ReadFile(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	formatted := fmt.Sprintf(`[%s]"%s"`, filepath.Base(path), string(data))
	clipboard.WriteAll(formatted)
	w.Write([]byte(formatted))
}

func buildTree(root string) (*FileNode, error) {
	info, err := os.Stat(root)
	if err != nil {
		return nil, err
	}

	node := &FileNode{
		Name:  info.Name(),
		Path:  root,
		IsDir: info.IsDir(),
	}

	if info.IsDir() {
		entries, err := os.ReadDir(root)
		if err != nil {
			return nil, err
		}
		for _, entry := range entries {
			childPath := filepath.Join(root, entry.Name())
			child, err := buildTree(childPath)
			if err == nil {
				node.Children = append(node.Children, child)
			}
		}
	}

	return node, nil
}
