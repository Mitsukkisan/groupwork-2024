const express = require('express');
const PORT = process.env.PORT || 5000;
const { firebaseApp, db, bucket } = require('./firebaseConfig');
const {  addSevenElevenProducts, getSevenElevenProducts, getFavoriteSevenElevenProducts } = require('./models/SevenElevenProducts');
const {  addLawsonProducts, getLawsonProducts, getFavoriteLawsonProducts } = require('./models/LawsonProducts');
const {addFamilyMartProducts,getFamilyMartProducts,getFavoriteFamilyMartProducts,}=require('./models/FamilyMartProducts');
const { FieldValue } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const auth = admin.auth();

// ミドルウェアの設定
const app = express();
app.use(express.static("./public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
require('dotenv').config();

const sevenElevenProducts = "sevenEleven_products"      //  セブンイレブン商品コレクション名
const sevenElevenFavorites = "sevenEleven_favorites";   //  セブンイレブンお気に入りコレクション名
const lawsonProducts = "lawson_products"                 //  ローソン商品コレクション名
const lawsonFavorites = "lawson_favorites"                //  ローソンお気に入りコレクション名
const familyMartProducts = "familymart_products"        //  ファミリーマート商品コレクション名
const familyMartFavorites = "familymart_favorites"      //  ファミリーマートお気に入りコレクション名
const region = 'region'             //  地域フィールド名
const prefecture = 'prefecture';    //  県名フィールド名

// ユーザー情報取得関数
const getUserInfo = async (uid, key) => {
    const userRef = await db.collection('users').doc(uid).get();
    const userData = userRef.data();
    const value = userData[key];
    console.log(`getUserInfo(${key})`, value);
    return value;
};
//  商品コレクション名
const collections = {
    "セブンイレブン": sevenElevenProducts,
    "ローソン": lawsonProducts,
    "ファミリーマート":familyMartProducts,
};
//  利用コンビニ名を取得
const getConveni = async (uid) => getUserInfo(uid, 'conveni');

// 利用コンビニ名に応じて商品コレクション名を返す関数
const getCollection = (conveni) => collections[conveni]

//  並び替え順を取得
const getOrder = async (uid) => getUserInfo(uid, 'order');

//  並び替えオプションを取得
const getOption = async (uid) => getUserInfo(uid, 'option');

//  住まいの地域名取得
const getRegion = async (uid) => getUserInfo(uid, region);
//  住まいの県名取得
const getPrefecture = async (uid) => getUserInfo(uid, prefecture);
//  商品コレクション名に応じてお気に入りコレクション名を返す
const getFavoritesFromProducts = (products) => {
    switch (products) {
        case sevenElevenProducts:
            return sevenElevenFavorites   //  セブンイレブンのお気に入りコレクション名
        case lawsonProducts:
            return lawsonFavorites      //  ローソンのお気に入りコレクション名
        case familyMartProducts: 
            return familyMartFavorites  //  ファミリーマートのお気に入りコレクション名
    }
}

//  利用コンビニ名に応じてお気に入りコレクション名を返す
const getFavoritesFromConveni = (conveni) => {
    switch (conveni) {
        case "セブンイレブン":
            return sevenElevenFavorites   //  セブンイレブンのお気に入りコレクション名
        case "ローソン":
            return lawsonFavorites      //  ローソンのお気に入りコレクション名
        case "ファミリーマート":
            return familyMartFavorites  //  ファミリーマートのお気に入りコレクション名
    }
}

//  スクレイピングメソッド
async function addProducts() {
    addFamilyMartProducts()
    addSevenElevenProducts();
    addLawsonProducts();
}


// お気に入り商品表示
app.get('/api/v1/favorites', async (req, res) => {
    const { uid } = req.query;                               //  ユーザID
    const conveni = await getConveni(uid);                  //  利用コンビニ名
    const products = getCollection(conveni);                //  商品コレクション名
    const option = await getOption(uid);                          //  並び替えオプション
    const order = await getOrder(uid);                             //  並び替え順
    console.log(products);
    const favorites = getFavoritesFromProducts(products);   //  お気に入りコレクション名
    let productIds; //  お気に入り商品ID
    let productData;   //  表示する商品データ
    //  ユーザがお気に入りした商品IDを取得
    querySnapshots = await db.collection(favorites).where('user_id', '==', uid).get();
    //  お気に入り商品が存在しない場合
    if (querySnapshots.empty) {
        console.log("お気に入り商品が見つかりません");
    }
    else {
        productIds = querySnapshots.docs.map(snapshot => snapshot.data().product_id); //  お気に入りした商品ID
        console.log("商品IDの配列", productIds)
        switch (products) {
            case sevenElevenProducts:
                productData = await getFavoriteSevenElevenProducts(productIds, option, order)
                break;
            case lawsonProducts:
                productData = await getFavoriteLawsonProducts(productIds, option, order);
                break;
            case familyMartProducts:
                productData = await getFavoriteFamilyMartProducts(productIds, option, order);
                break;
        }
    }
    return res.json({ message: 'データ取得成功', productData, productIds, conveni, option, order });
})

//  ランキング表示
app.get('/api/v1/ranking', async (req, res) => {
    const { uid } = req.query;
    console.log("/api/v1/ranking uid", uid);
    const conveni = await getConveni(uid);
    console.log("/api/v1/ranking conveni", conveni)
    const products = getCollection(conveni);
    console.log("/api/v1/ranking products ", products)
    const favorites = getFavoritesFromProducts(products);
    console.log("/api/v1/ranking お気に入りコレクション名", favorites);
    let productIds;           //  お気に入り商品ID
    let productDatas = [];   //  ランキング表示商品
    FavoriteQuerySnapshot = await db.collection(favorites).where('user_id', '==', uid).get();
    //  お気に入り商品が存在しない場合
    if (FavoriteQuerySnapshot.empty) {
        console.log("お気に入り商品が見つかりません");
    }
    else {
        productIds = FavoriteQuerySnapshot.docs.map(snapshot => snapshot.data().product_id); //  お気に入りした商品ID
    }
    try {
        const ProductQuerySnapshot = await db.collection(products).orderBy('favorites', 'desc').limit(3).get();
        ProductQuerySnapshot.docs.map(async (ProductDocSnapshot) => {
            const data = ProductDocSnapshot.data();
            if (data.date) {
                const date = new Date(data.date._seconds * 1000);    //  TIMESTAMP型をDate型に変換
                formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日(${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]})`;
            }
            // 商品データを配列に追加
            productDatas.push({
                id: ProductDocSnapshot.id,
                name: data.name,
                category:data.category,
                date: formattedDate,
                price: data.price,
                favorites: data.favorites,
                allergies: data.allergies,
                regions: data.regions,
                image: data.image,
            });
        })
    } catch (error) {
        console.log(error)
    }
    return res.json({ message: 'データ取得成功', productDatas, productIds, conveni });
})

//  起動時
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
//  スクレイピング処理
app.get('/api/v1/scraping', async (req, res) => {
    addProducts();
    res.send("スクレイピングを完了しました")
})
//  利用コンビニ,住まいの地域,住まいの県登録
app.post('/api/v1/menu', async (req, res) => {
    //  利用コンビニ名,地域名,県名,ユーザID
    const { conveni, region, prefecture, uid } = req.body
    const option = 'date'   //  並び替えオプションデフォルト値
    const order = 'desc'    //  並び替え順デフォルト値
    try {
        const userRef = await db.collection("users").doc(uid).get();
        if (userRef.exists) {
            // ユーザー情報を更新
            await userRef.ref.update({
                conveni: conveni,
                region: region,
                prefecture: prefecture,
                option: option,
                order: order,
            });
            res.send("アップデートしました");
        } else {
            res.status(404).send("ユーザーが見つかりません");
        }
    } catch (error) {
        console.error("エラー:", error);
        res.status(500).send("エラーが発生しました");
    }

})

//  ホームページの商品表示
app.get('/api/v1/home', async (req, res) => {
    const { uid } = req.query;                            //    ユーザID
    const conveni = await getConveni(uid);                //    利用コンビニ名
    const region = await getRegion(uid);                  //    住まいの地域名
    const prefecture = await getPrefecture(uid);          //    住まいの県名
    const favorites = getFavoritesFromConveni(conveni);   //    お気に入りコレクション名
    const option = await getOption(uid);                        //    並び替えオプション
    const order = await getOrder(uid);                          //    並び替え順
    console.log('/api/v1/home option', option);
    console.log('/api/v1/home order', order);
    console.log('/api/v1/home region', region);
    console.log('/api/v1/home prefecture', prefecture);
    let productIds;      //  お気に入りした商品ID
    let productsDatas;   //  商品コレクションの各ドキュメント

    //  ユーザがお気に入りした商品IDを取得
    querySnapshots = await db.collection(favorites).where('user_id', '==', uid).get();
    productIds = querySnapshots.docs.map(snapshot => {
        const data = snapshot.data()
        const product_id = data.product_id;
        return product_id
    })
    //  利用コンビニ名に応じて表示するコンビニ商品を変更
    switch (conveni) {
        case "セブンイレブン":
            productsDatas = await getSevenElevenProducts(region, prefecture, option, order);
            break;
        case "ローソン":
            productsDatas = await getLawsonProducts(option, order);
            break;
        case"ファミリーマート":
            productsDatas = await getFamilyMartProducts(region,option,order);
    }
    return res.json({ message: 'データ取得成功', productsDatas, productIds, conveni, option, order });
});

//  利用コンビニ更新
app.patch('/api/v1/update', async (req, res) => {
    const { uid, conveni } = req.body;
    try {
        userSnapshot = await db.collection("users").doc(uid).get();
        if (userSnapshot.exists) {
            await userSnapshot.ref.update({
                conveni: conveni,
            })
            // レスポンスを送信
            res.status(200).send(`利用コンビニを ${conveni} に変更しました`);
        }
        else {
            console.log('ユーザ情報取得に失敗しました');
            res.status(404).send('ユーザー情報が見つかりません');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('サーバーでエラーが発生しました');
    }
})
//  並び替えオプション更新
app.patch('/api/v1/order', async (req, res) => {
    const { uid, sortOption } = req.body;
    let option; //  並び替えフィールド名
    let order;  //  並び替え順
    switch (sortOption) {
        case "新着商品":
            option = 'date';
            order = 'desc';
            break;
        case "安い順":
            option = 'price';
            order = 'asc';
            break;
        case "高い順":
            option = 'price';
            order = 'desc';
            break;
    }
    try {
        userSnapshot = await db.collection("users").doc(uid).get();
        if (userSnapshot.exists) {
            await userSnapshot.ref.update({
                option: option,
                order: order,
            })
            // レスポンスを送信
            res.status(200).send(`並び替えオプションを ${option} ,${order}変更しました`);
        }
        else {
            console.log('ユーザ情報取得に失敗しました');
            res.status(404).send('ユーザー情報が見つかりません');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('サーバーでエラーが発生しました');
    }
})

//  お気に入り登録
app.post('/api/v1/favorites/', async (req, res) => {
    const { uid, product_id } = req.body;       //  ユーザID,商品ID
    const conveni = await getConveni(uid);      //  利用コンビニ名
    const document_id = `${uid}_${product_id}`; //  保存するドキュメントID
    const products = getCollection(conveni);    //  商品コレクション名
    console.log('/api/v1/favorites/ post', products);
    const favorites = getFavoritesFromProducts(products);           //  お気に入りコレクション名
    const favoriteRef = db.collection(favorites).doc(document_id);  //  お気に入り商品の保存先
    const productRef = db.collection(products).doc(product_id);     //  お気に入り登録数を増やす商品
    try {
        //  お気に入り登録
        await favoriteRef.create({
            user_id: uid,
            product_id: product_id,
        });
        //  お気に入り登録数を増加
        await productRef.update({
            favorites: FieldValue.increment(1),
        })
        res.status(201).send("お気に入りに追加しました");
    } catch (error) {
        res.status(500).send("お気に入り追加に失敗しました: " + error.message);
    }
})

//  お気に入り削除
app.delete('/api/v1/favorites', async (req, res) => {
    const { uid, product_id } = req.body;       //  ユーザID,商品ID
    const conveni = await getConveni(uid);      //  利用コンビニ名
    const document_id = `${uid}_${product_id}`; //  削除ドキュメントID
    const products = getCollection(conveni);    //  商品コレクション名
    console.log('/api/v1/favorites delete', products);
    const favorites = getFavoritesFromProducts(products);       //  お気に入りコレクション名
    const productRef = db.collection(products).doc(product_id); //  お気に入り登録数を減らす商品
    try {
        // お気に入り登録数を減らす
        await productRef.update({
            favorites: FieldValue.increment(-1),
        });
        // お気に入りを削除
        await db.collection(favorites).doc(document_id).delete();
        res.status(200).send("お気に入りを削除しました");
    } catch (error) {
        res.status(500).send("お気に入り削除に失敗しました: " + error.message);
    }
})
app.listen(PORT, () => { console.log(`http://localhost:${PORT}`) });
