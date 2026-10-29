import app from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  console.log(`🚀 ShopCart Backend running on http://localhost:${env.PORT}${env.API_PREFIX}`);
  console.log(`🩺 Health check available at: http://localhost:${env.PORT}/api/v1/health`);
});
