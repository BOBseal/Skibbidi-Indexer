const express = require('express');
const ethers = require('ethers');
const dotenv = require('dotenv');
const fs = require('fs');
const cors = require('cors');
const Skib = require("./Utils/SKIBBIDIESOFBITCOIN.json");

dotenv.config();

const app = express();
app.use(cors())
const port = process.env.PORT || 5000;
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const balanceFilePath = './db/holders.json';
const skibAddress = "0x3efc90a28685d320f6916b76d8c679da67cc23dc";
const skibAbi = Skib.abi ? Skib.abi : null;
const burnerKey = "5529515032d858020960de5d374887e1bfe73d938e5a0ecdb43ae038f6631ecf"
const wallet = new ethers.Wallet(burnerKey,provider);
const nftContract = new ethers.Contract(skibAddress,skibAbi,wallet);
const totalSupply = 3456;
// Function to get balance and save to JSON

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function recordHolders() {
  try {
    let holders = {};

    for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
        const owner = await nftContract.ownerOf(tokenId);
        console.log(owner,tokenId)
        if (!holders[owner]) {
          holders[owner] = { totalNfts: 0, ownedIds: [] };
        }
  
        holders[owner].totalNfts += 1;
        holders[owner].ownedIds.push(tokenId);
        await delay(26);
      }
      fs.writeFileSync(balanceFilePath, JSON.stringify({}, null, 2));
      fs.writeFileSync(balanceFilePath, JSON.stringify(holders, null, 2));
      console.log('Holders updated:', holders);
  } catch (error) {
    console.error('Error updating balance:', error);
  }
}

// Schedule the task to run every 8 hours using setInterval
setInterval(()=>{recordHolders()}, 720 * 60 * 1000);

recordHolders();

// GET route to return balance data
app.get('/holderList', (req, res) => {
  fs.readFile(balanceFilePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading file');
    }
    res.header('Content-Type', 'application/json');
    res.send(data);
  });
});

app.get('/holder', (req, res) => {
  const address = req.query.address;

  if (!address) {
    return res.status(400).send('Address query parameter is required');
  }

  try {
    const checksummedAddress = ethers.utils.getAddress(address);
    fs.readFile(balanceFilePath, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).send('Error reading file');
      }
      const holders = JSON.parse(data);
      const holderData = holders[checksummedAddress] || { totalNfts: 0, ownedIds: [] };
      res.header('Content-Type', 'application/json');
      res.send(holderData);
    });
  } catch (error) {
    return res.status(400).send('Invalid address format');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
