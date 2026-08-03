import app from "./app";
import { env } from "./config/env";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`
=========================================
🚀 Propel Backend Started Successfully
🌍 Environment : ${env.NODE_ENV}
📡 Server      : http://localhost:${PORT}
=========================================
`);
});
