const express = require('express');
const router = express.Router();
const admin = require('../config/firebase');

// 用户注册
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        // 使用 Firebase 创建用户
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password
        });

        // 生成自定义 token
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        res.status(201).json({
            message: 'User registered successfully',
            uid: userRecord.uid,
            email: userRecord.email,
            token: customToken
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).json({ error: 'Email already in use' });
        }
        res.status(500).json({ error: error.message });
    }
});

// 用户登录（获取 ID Token）
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // 注意：这里需要在前端使用 Firebase SDK 验证用户
        // 后端会验证前端发送的 ID Token
        // 这是一个简化的实现，实际应该在前端做认证
        
        // 为了演示，我们创建一个自定义 token
        // 在生产环境中，应该让前端使用 Firebase SDK 获取 ID Token
        
        res.status(200).json({
            message: 'Please use Firebase SDK to login',
            error: 'Use signInWithEmailAndPassword from Firebase client SDK'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
