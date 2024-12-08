import axios from 'axios';
const URL = "http://localhost:5000/api/v1/item";

async function getItems(){
    try {
        const response = await axios.get(URL);
        console.log(response);
    } catch (error) {
        console.log(error);
    }
}

getItems();



