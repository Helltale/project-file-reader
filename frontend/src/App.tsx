import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { Moon, Sun, ClipboardCopy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

const TreeNode = ({ node, onClick, filter }: { node: FileNode; onClick: (node: FileNode) => void; filter: string }) => {
  const [expanded, setExpanded] = useState(false);
  const matches = node.name.toLowerCase().includes(filter.toLowerCase());

  if (!matches && !node.isDir && filter) return null;

  return (
    <div className="ml-4">
      <div
        onClick={() => (node.isDir ? setExpanded(!expanded) : onClick(node))}
        className="cursor-pointer select-none hover:underline text-sm flex items-center gap-1"
      >
        <span>{node.isDir ? (expanded ? "📂" : "📁") : "📄"}</span>
        <span>{node.name}</span>
      </div>
      {expanded &&
        node.children?.map((child) => (
          <TreeNode key={child.path} node={child} onClick={onClick} filter={filter} />
        ))}
    </div>
  );
};

export default function App() {
  const [path, setPath] = useState("");
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [preview, setPreview] = useState<{ name: string; content: string } | null>(null);
  const [filter, setFilter] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as "light" | "dark";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(storedTheme || (prefersDark ? "dark" : "light"));
  }, []);

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem("pathHistory") || "[]");
    setHistory(savedHistory);
  }, []);

  const savePathToHistory = (newPath: string) => {
    const updated = [newPath, ...history.filter((p) => p !== newPath)].slice(0, 5);
    setHistory(updated);
    localStorage.setItem("pathHistory", JSON.stringify(updated));
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const loadTree = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tree?root=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error("Ошибка при загрузке");
      const data = await res.json();
      setTree(data);
      toast.success("Дерево проекта загружено ✅");
      savePathToHistory(path);
    } catch (err) {
      toast.error("Не удалось загрузить дерево проекта");
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = async (node: FileNode) => {
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(node.path)}`);
      const text = await res.text();
      toast.success(`Содержимое скопировано: ${node.name}`);
      setPreview({ name: node.name, content: text });
    } catch (e) {
      toast.error("Не удалось скопировать файл");
    }
  };

  const copyAll = async () => {
    const flattenFiles = async (node: FileNode): Promise<string[]> => {
      if (!node.isDir) {
        const res = await fetch(`/api/file?path=${encodeURIComponent(node.path)}`);
        const text = await res.text();
        return [text];
      }
      const children = await Promise.all(
        node.children?.map(flattenFiles) || []
      );
      return children.flat();
    };

    if (!tree) return;
    const all = await flattenFiles(tree);
    await navigator.clipboard.writeText(all.join("\n\n"));
    toast.success("Всё содержимое скопировано 📋");
  };

  return (
    <div className="min-h-screen transition bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-white dark:bg-gray-800 shadow-md rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">📁 Обозреватель проекта</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              {tree && (
                <button
                  onClick={copyAll}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="Скопировать всё"
                >
                  <ClipboardCopy size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="Путь к папке проекта"
              className="flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring focus:border-blue-300 bg-white dark:bg-gray-700 dark:border-gray-600"
            />
            <button
              onClick={loadTree}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
            >
              {loading ? "Загрузка..." : "Загрузить"}
            </button>
          </div>

          {history.length > 0 && (
            <div className="mb-4">
              <label className="text-sm text-gray-500 dark:text-gray-400">История путей:</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {history.map((h) => (
                  <button
                    key={h}
                    onClick={() => setPath(h)}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            type="text"
            placeholder="Поиск по имени файла"
            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-700 dark:border-gray-600 mb-4"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />

          {tree ? (
            <div className="text-sm">
              <TreeNode node={tree} onClick={handleFileClick} filter={filter} />
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Введите путь и нажмите "Загрузить"</p>
          )}
        </div>

        {preview && (
          <div className="w-full md:w-[50%] bg-white dark:bg-gray-800 shadow-md rounded-2xl p-4 overflow-auto">
            <h2 className="font-semibold mb-2">Предпросмотр: {preview.name}</h2>
            <SyntaxHighlighter
              language="text"
              style={theme === "dark" ? oneDark : oneLight}
              customStyle={{ background: "transparent", padding: 0 }}
              wrapLongLines
            >
              {preview.content}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
      <Toaster richColors position="bottom-center" />
    </div>
  );
}
