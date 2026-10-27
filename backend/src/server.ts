import dotenv from 'dotenv';
import app from './app.js';
  
    dotenv.config();
  
    const PORT = parseInt(process.env.PORT || '3000', 10);
  
    app.listen(PORT, () => {
      console.log(`🚀 ShopCart Backend running on http://localhost:${PORT}/api/v1`);                                                                                                                 
      console.log(`🩺 Health check available at: http://localhost:${PORT}/api/v1/health`);                                                                                                           
    });