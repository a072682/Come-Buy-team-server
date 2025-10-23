// routes/proxy.routes.js
//此路由作用為前端使用api時會回傳
//目前沒用到
const express = require('express');              // 改成 require
const axios = require('axios');                  // 改成 require
const router = express.Router();

const api = axios.create({
  baseURL: process.env.API_BASE,
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${process.env.API_TOKEN}`,
  },
});

router.get('/mydata', async (req, res) => {
  try {
    const response = await api.get('/v1/data', { params: req.query });
    res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || { error: error.message };
    res.status(status).json(message);
  }
});

module.exports = router;  // 改成 module.exports
