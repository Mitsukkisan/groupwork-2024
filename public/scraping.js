const isTuesDay = () => {
    const isTuesDay = new Date().getDay(); //  現在曜日取得
    if (isTuesDay === 2) {
        return true;
    }
    else {
        return false;
    }
}

const sevenScraping = async () => {
    const day = isTuesDay();
    //  火曜日の場合スクレイピングを行う
    // try {
    //     if (day) {
    //         const response = await axios.get('/api/v1/scraping');
    //         console.log(response.data)
    //     }
    // } catch (error) {
    //     console.log(error);
    // }

}

sevenScraping();




