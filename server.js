import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve all static files from repository root
app.use(express.static(__dirname, {
  extensions: ['html', 'htm'],
  index: 'index.html'
}));

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});
