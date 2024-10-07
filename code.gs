// Solana RPC Endpoint
const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";

// Define wallet address globally
const walletAddress = "your wallet";

// Function to fetch SOL balance from Solana RPC
function getSolBalance() {
  Logger.log(`Received wallet address: '${walletAddress}'`);

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "getBalance",
    params: [walletAddress]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  try {
    const response = UrlFetchApp.fetch(SOLANA_RPC_URL, options);
    const data = JSON.parse(response.getContentText());

    if (data && data.result && data.result.value) {
      return data.result.value / 1000000000; // Convert lamports to SOL
    } else {
      Logger.log("Error fetching SOL balance: " + response.getContentText());
      return null;
    }
  } catch (e) {
    Logger.log("Error fetching SOL balance: " + e.message);
    return null;
  }
}

// Function to get SPL token balances for a wallet
function getSplTokenBalances() {
  Logger.log(`Received wallet address for SPL token balances: '${walletAddress}'`);

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenAccountsByOwner",
    params: [
      walletAddress,
      { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      { encoding: "jsonParsed" }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  try {
    const response = UrlFetchApp.fetch(SOLANA_RPC_URL, options);
    const data = JSON.parse(response.getContentText());

    if (data && data.result && data.result.value) {
      return data.result.value;
    } else {
      Logger.log("Error fetching SPL token balances: " + response.getContentText());
      return null;
    }
  } catch (e) {
    Logger.log("Error fetching SPL token balances: " + e.message);
    return null;
  }
}

// Function to get token price from Jupiter API
function getTokenPrice(tokenAddress) {
  Logger.log(`Fetching price for token address: '${tokenAddress}'`);

  const priceUrl = `https://api.jup.ag/price/v2?ids=${tokenAddress}`;

  try {
    const response = UrlFetchApp.fetch(priceUrl);
    const priceData = JSON.parse(response.getContentText());

    if (priceData && priceData.data && priceData.data[tokenAddress]) {
      return parseFloat(priceData.data[tokenAddress].price);
    }
  } catch (e) {
    Logger.log("Error fetching token price: " + e.message);
  }

  return null;
}

// Main function to print wallet balances and total value in Google Sheet
function printTotalWalletValue() {
  // Get the active spreadsheet and sheet to output results
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");

  // Check if sheet exists
  if (!sheet) {
    Logger.log('Error: The sheet named "Sheet1" was not found.');
    return;
  }

  // Clear previous results (optional)
  sheet.getRange("A1:D").clearContent();

  let totalValueUsd = 0.0;

  // Get SOL balance and its value in USD
  const solBalance = getSolBalance();

  if (solBalance !== null) {
    const solPrice = getTokenPrice('So11111111111111111111111111111111111111112');
    if (solPrice !== null) {
      const solUsdValue = solBalance * solPrice;
      totalValueUsd += solUsdValue;
      Logger.log(`SOL balance: ${solBalance.toFixed(4)} SOL | Value in USD: ${solUsdValue.toFixed(4)}`);
    }
  }

  // Get SPL token balances
  const tokenAccounts = getSplTokenBalances();

  if (tokenAccounts && tokenAccounts.length !== 0) {
    tokenAccounts.forEach(account => {
      const tokenInfo = account.account.data.parsed.info;
      const tokenAddress = tokenInfo.mint;
      const tokenBalance = parseFloat(tokenInfo.tokenAmount.uiAmount);

      // Skip adding So11111111111111111111111111111111111111112 (SOL token) or if the balance is 0
      if (tokenAddress === 'So11111111111111111111111111111111111111112' || tokenBalance === 0) {
        return;
      }

      const tokenPrice = getTokenPrice(tokenAddress);

      if (tokenPrice !== null) {
        const tokenValue = tokenBalance * tokenPrice;
        totalValueUsd += tokenValue;
      }
    });
  }

  // Write total wallet value to Google Sheet
  sheet.getRange("A1").setValue("Total Wallet Value (USD)");
  sheet.getRange("D1").setValue(totalValueUsd.toFixed(4));

  // Write header
  sheet.getRange("A2:D2").setValues([[
    "Token Type", "Address", "Balance", "Value (USD)"
]]);

  let currentRow = 3;

  // Write SOL balance to Google Sheet if available
  if (solBalance !== null) {
    const solPrice = getTokenPrice('So11111111111111111111111111111111111111112');
    if (solPrice !== null) {
      const solUsdValue = solBalance * solPrice;
      sheet.getRange(`A${currentRow}:D${currentRow}`).setValues([[
        "SOL", walletAddress, solBalance.toFixed(4), solUsdValue.toFixed(4)
      ]]);
      currentRow++;
    }
  }

  // Write SPL token balances to Google Sheet if available
  if (tokenAccounts && tokenAccounts.length !== 0) {
    tokenAccounts.forEach(account => {
      const tokenInfo = account.account.data.parsed.info;
      const tokenAddress = tokenInfo.mint;
      const tokenBalance = parseFloat(tokenInfo.tokenAmount.uiAmount);

      const tokenPrice = getTokenPrice(tokenAddress);

      if (tokenPrice !== null) {
        const tokenValue = tokenBalance * tokenPrice;
        // Write each token balance to Google Sheet in a single row
        sheet.getRange(`A${currentRow}:D${currentRow}`).setValues([[
    "SPL Token", tokenAddress, tokenBalance.toFixed(4), tokenValue.toFixed(4)
]]);
        currentRow++;
      }
    });
  } else {
    Logger.log(`No SPL tokens found for wallet: ${walletAddress}`);
    sheet.getRange(`A${currentRow}`).setValue("No SPL tokens found");
  }
}
