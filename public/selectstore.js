const selectStoreDOM = document.getElementById('selectStore');

selectStoreDOM.addEventListener('change', (event) => {
    const option = event.target.value;
    const fetchProducts = async (url, queryParams = {}) => {
        try {
            // クエリパラメータをURLに追加
            const queryString = new URLSearchParams(queryParams).toString();
            const fullUrl = queryString ? `${url}?${queryString}` : url;

            const response = await axios.get(fullUrl);
            const { data: products } = response; // サーバーからのレスポンスを取得
            console.log(products); // サーバーからのデータをコンソールに出力（デバッグ用）

            // 必要に応じてDOM操作で表示
            // displayProducts(products);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };
    switch (option) {
        case "0": console.log("セブンイレブン");
            fetchProducts('api/v1/sevenEleven/home', {
                option: 'new', // 例: 新着商品順
                order: 'desc', // 例: 降順
            });
            break;
        case "1": console.log("ファミリーマート")
            break
        case "2": console.log("ローソン")
            const getLawson = async () => {
                try {
                    const response = axios.get('api/v1/lawson/getProducts');
                    const { data: { products } } = response;
                } catch (error) {
                    console.log(error);
                }
            }
            break;
    }

})