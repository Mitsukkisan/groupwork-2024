const puppeteer = require('puppeteer')
const axios = require('axios');
const { PassThrough } = require('stream');
// const { db, bucket, } = require('../firebaseConfig');
require('dotenv').config();

//  firestoreのコレクション名
const collectionName = 'familymart_products';
//  firestorageのフォルダ名
const storageFolderName = 'familymart_image'
//  新商品の要素
const element = "#new_layout-3clm > div:nth-child(1)"
//  ホームページURL
const homePage = "https://www.family.co.jp/goods/newgoods.html"

const familyMartScraper = async()=>{
     //  テスト時はheadless:falseで実行
        const browser = await puppeteer.launch({ headless: false });
        //  新商品配列
        const newProducts = [];
        try {
            const page = await browser.newPage();
            await page.goto(homePage);
            const datas = await page.$$(element);
            for (let i = 0; i < datas.length; i++) {
                const currentProducts = await page.$$(element);
                const data = currentProducts[i];
                //  商品画像
                const imgElementHandle = await data.$('div > a > div > p > img');
                const image = await imgElementHandle.evaluate(el => el.getAttribute('data-original'));
    
                //  商品名
                const nameElementHandle = await data.$('div.item_ttl > p > a');
                const name = await nameElementHandle.evaluate(el => el.textContent.trim());
    
                //  販売価格(税込み)
                const priceElementHandle = await data.$('div > div.item_price > p');
                const rawPrice = await priceElementHandle.evaluate(el => el.textContent.trim());
                //  文字列から整数型に変換
                const priceRegex = /(\d+)円/;
                const priceFound = rawPrice.match(priceRegex);
                const taxedPrice = parseInt(priceFound[1], 10) * 1.08;
                const price = Math.round(taxedPrice);
    
    
                //  販売開始日
                const trimRegex = /（.）以降順次発売/;
                const dateregex = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
                const dateElementHandle = await data.$('div > div.item_launch > p');
                const rawDate = await dateElementHandle.evaluate(el => el.textContent.trim());
                const trimedDate = rawDate.replace(trimRegex, "").trim();
                const replacedDate = trimedDate.replace(dateregex, "$1-$2-$3");
                const date = new Date(replacedDate)
    
                //  販売地域
                const regionElementHandle = await data.$('div > div.item_region > p');
                const rawRegion = await regionElementHandle.evaluate(el => el.textContent.trim());
                const regions = rawRegion.replace("販売地域：", "").split("、");
                await Promise.all(
                    [
                        page.waitForNavigation(),
                        data.$eval('figure > a', el => el.click()) // li要素内のaタグをクリック
                    ]
                )
                // console.log("新商品のページURL", page.url());
    
                const allergiesElementHandle = await page.$('#pbBlock1778459 > div.detail_wrap> div.allergy > table > tbody > tr:nth-child(1) > td > dl > dd');
                const rawallergies = await allergiesElementHandle.evaluate(el => el.textContent.trim());
                const allergies = rawallergies.split('・').map(item => item.trim());
                // console.log("この商品のアレルギー", allergies)
                // 前のページに戻る
                await Promise.all(
                    [
                        page.waitForNavigation({ waitUntil: 'load' }),
                        page.goBack(),
                    ]
                )
                newProducts.push({
                    name: name,          //  商品名
                    image: image,        //  商品画像
                    date: date,          //  販売開始日
                    price: price,        //  販売価格
                    regions: regions,     //  販売地域
                    allergies: allergies,//  アレルギー
                })
                console.log("戻ったページ:", page.url())
                console.log("商品名:", name);
                console.log("商品画像:", image);
                console.log("販売価格:", price + "円（税込み)");
                console.log("販売開始日:", date);
                console.log("販売地域:", regions);
            }
            return newProducts
        } catch (error) {
            console.log(error);
        }
        finally {
            await browser.close();
        }
}
familyMartScraper()