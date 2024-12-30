const express = require('express');
const router = express.Router();

const {
    addSevenElevenProducts,
    getSevenElevenProducts,
} = require('../models/SevenElevenProducts');

router.get('/home',async(req,res)=>{
    const { option, order, allergies } = req.query;
    try {
        const products = await getSevenElevenProducts(option, order, allergies);
        res.status(200).json(products);
    } catch (error) {
        console.error('商品取得中にエラー:', error);
        res.status(500).json({ error: '商品取得中にエラーが発生しました。' });
    }
})
router.get('/favorites',(req,res)=>{
    
})
router.get('/ranking',(req,res)=>{
    
})

router.post('/',(req,res)=>{
    
})

router.put('/',(req,res)=>{
    
})

router.delete('/',(req,res)=>{
    
})

module.exports = router;