//fetch list of users items on server
Moralis.Cloud.define("getUserItems", async (request) => {

    const query = new Moralis.Query("EthNFTOwners"); //look at NFT owners
    query.equalTo("contract_type", "ERC721"); //find erc721s
    query.containedIn("owner_of", request.user.attributes.accounts); //find ones that belong to connected user
    const queryResults = await query.find(); //put results into variable once found
    const results = []; //display results as array
    for (let i = 0; i < queryResults.length; ++i) {
      results.push({ //put results into results array
        "tokenObjectId": queryResults[i].id,
        "tokenId": queryResults[i].attributes.token_id,
        "tokenAddress": queryResults[i].attributes.token_address,
        "symbol": queryResults[i].attributes.symbol,
        "tokenUri": queryResults[i].attributes.token_uri,
      });
    }
    return results;
  });

//add additional data to objects added to 'itemsForSale' table
  Moralis.Cloud.beforeSave("itemsForSale", async (request) => {
  
    const query = new Moralis.Query("EthNFTOwners");
    query.equalTo("token_address", request.object.get('tokenAddress'));
    query.equalTo("token_id", request.object.get('tokenId'));
    const object = await query.first();
    if (object){
        const owner = object.attributes.owner_of;
      const userQuery = new Moralis.Query(Moralis.User);
        userQuery.equalTo("accounts", owner);
      const userObject = await userQuery.first({useMasterKey:true});
      if (userObject){
          request.object.set('user', userObject);
      }
      request.object.set('token', object);
    }
  });

  Moralis.Cloud.beforeSave("soldItems", async (request) => {
  
    const query = new Moralis.Query("itemsForSale");
    query.equalTo("uid", request.object.get('uid'));
    const item = await query.first();
    if (item){
      request.object.set('item', item);
      item.set('isSold', true);
      await item.save();
      
    
      const userQuery = new Moralis.Query(Moralis.User);
        userQuery.equalTo("accounts", request.object.get('buyer'));
      const userObject = await userQuery.first({useMasterKey:true});
      if (userObject){
          request.object.set('user', userObject);
      }
    }
  });

//fetching all items for sale 
Moralis.Cloud.define("getItems", async (request) => {

    const query = new Moralis.Query("itemsForSale"); //look at NFTs for sale
    query.notEqualTo("isSold", true); //makes sure item is not sold
  
  	if (request.user) { //if user is logged in
    	query.notContainedIn("token.owner_of", request.user.attributes.accounts); //don't show users items for sale
    }
  	
  	query.select("uid", "tokenAddress", "tokenId", "askingPrice", "token.token_uri", "token.symbol", "token.owner_of", "user.username", "user.avatar");
  
    const queryResults = await query.find({useMasterKey:true}); //put results into variable once found
    const results = []; //display results as array
    
  	for (let i = 0; i < queryResults.length; ++i) {
      
      if(!queryResults[i].attributes.token || !queryResults[i].attributes.user) continue; //if no token or user is set, skip item in query
      
      results.push({
        "uid": queryResults[i].attributes.uid,
        "tokenId": queryResults[i].attributes.tokenId,
        "tokenAddress": queryResults[i].attributes.tokenAddress,
        "askingPrice": queryResults[i].attributes.askingPrice,
  
        "symbol": queryResults[i].attributes.token.attributes.symbol,
        "tokenUri": queryResults[i].attributes.token.attributes.token_uri,
        "ownerOf": queryResults[i].attributes.token.attributes.owner_of,
        "tokenObjectId": queryResults[i].attributes.token.id,
        
        "sellerUsername": queryResults[i].attributes.user.attributes.username,
        "sellerAvatar": queryResults[i].attributes.user.attributes.avatar,
      });
    }
    return results;
  });
