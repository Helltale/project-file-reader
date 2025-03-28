echo "▶ Запуск backend (Go)..."
cd backend
go run main.go &
BACK_PID=$!

echo "▶ Запуск frontend (Vite)..."
cd ../frontend
npm run dev

echo "⏹ Остановка backend..."
kill $BACK_PID