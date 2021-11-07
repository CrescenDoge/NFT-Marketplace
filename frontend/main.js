Moralis.initialize("3fdby4TncUz6Fct7Fxw7xwjnIskB1AzQs6REGNm3"); //ID to connect to moralis
Moralis.serverURL = 'https://d3x95g434qnv.moralisweb3.com:2053/server' //test server

const TOKEN_CONTRACT_ADDRESS = "0x7cCEe32B4814665d0e1a6723EB4e8fF555856A59";
const MARKETPLACE_CONTRACT_ADDRESS = "0x13Cf4089770D99336CbbcF30C30C14AF5Ebd7e65";

init = async () => {
    hideElement(userItemsSection);
    hideElement(userInfo); //hides profile info upon init and shows 'connect wallet'
    hideElement(createItemForm);
    window.web3 = await Moralis.Web3.enable(); //enable Moralis API
    window.tokenContract = new web3.eth.Contract(tokenContractAbi, TOKEN_CONTRACT_ADDRESS);
    window.marketplaceContract = new web3.eth.Contract(marketplaceContractAbi, MARKETPLACE_CONTRACT_ADDRESS);
    initUser();
    loadItems();
}

initUser = async () => { //checks to see if any user in connect
    if(await Moralis.User.current()){ // .current will return current user authenticated or null
        hideElement(userConnectButton);
        showElement(userProfileButton);
        showElement(openCreateItemButton);
        showElement(openUserItemsButton);
        loadUserItems();
    }else{
        showElement(userConnectButton);
        hideElement(userProfileButton);
        hideElement(openCreateItemButton);
        hideElement(createItemForm);
        hideElement(openUserItemsButton);
    }
}

login = async () => { //call moralis fuction to authenticate user with metamask
    try {
        await Moralis.Web3.authenticate();
        initUser();
    } catch (error) {
        alert(error)
    }
}

logout = async () => { //disconnect wallet
    await Moralis.User.logOut();
    hideElement(userInfo);
    initUser();
}

openUserInfo = async () => { //opens user info menu
    user = await Moralis.User.current(); //sets variable ass current user id
    if (user){
        const email = user.get('email'); //returns 'email' from moralis database
        if(email){
            userEmailField.value = email;
        }else{
            userEmailField.value = ""; //leave blank if none
        }

        userUsernameField.value = user.get('username'); //gets username from moralis database; if no username set, and auto generated name will display

        const userAvatar = user.get('avatar'); //returns avatar from moralis database
        if(userAvatar){
            userAvatarImg.src = userAvatar.url();
            showElement(userAvatarImg);
        }else{
            hideElement(userAvatarImg); //diplay default if none is set
        }

        showElement(userInfo); //show user info after data is retreived 
    }else{
        login(); //initiates authentiation if no user is logged in
    }
}

saveUserInfo = async() => {
    // .set will save info to moralis .set(tag,input)
    user.set('email',userEmailField.value); //set email using whats entered in the email text field
    user.set('username',userUsernameField.value); //set username using whats in the username text field

    if (userAvatarFile.files.length > 0) {
        const avatar = new Moralis.File("avatar.jpg", userAvatarFile.files[0]);
        user.set('avatar', avatar);
    }
    
    await user.save(); //saves changed data to database
    alert("Use Info Saved Successfully");
    openUserInfo(); //runs this functon to reinit info
}

//use more meta tags to better align with ID3 standard
createItem = async () => {
    if(createItemFile.files.length == 0){ //check to see if file is selected
        alert("Please Select a File");
        return;
    }else if(createItemNameField.value.length == 0){ //check to see if name is entered
        alert("Please Name The Item");
        return;
    }

    const nftFile = new Moralis.File("nftFile.jpg",createItemFile.files[0]); //brings file into moralis (name of object, path)
    await nftFile.saveIPFS(); //save file to IPFS

    const nftFilePath = nftFile.ipfs(); //returns IPFS file path
    const nftFileHash = nftFile.hash(); //returns IPFS hash

    //create meta data file
    const metaData = {
        name: createItemNameField.value,
        description: createItemDescriptionField.value,
        image: nftFilePath,
    };

    const nftFileMetaDataFile = new Moralis.File("metaData.json", {base64 : btoa(JSON.stringify(metaData))}); //brings file into moralis (name of object, path)
    await nftFileMetaDataFile.saveIPFS();//save file to IPFS

    const nftFileMetaDataFilePath = nftFileMetaDataFile.ipfs(); //returns IPFS file path
    const nftFileMetaDataFileHash = nftFileMetaDataFile.hash(); //returns IPFS hash

    const nftId = await mintNft(nftFileMetaDataFilePath);

    // Simple syntax to create a new subclass of Moralis.Object.
    const Item = Moralis.Object.extend("Item");

    // Create a new instance of that class.
    const item = new Item();

    item.set('name',createItemNameField.value)
    item.set('description',createItemDescriptionField.value)
    item.set('nftFilePath',nftFilePath)
    item.set('nftFileHash',nftFileHash)
    item.set('metaDataFilePath',nftFileMetaDataFilePath)
    item.set('metaDataFileHash',nftFileMetaDataFileHash)
    item.set('nftId', nftId);
    item.set('nftContractAddress', TOKEN_CONTRACT_ADDRESS);
    await item.save(); //save item (metadata json file) to moralis
    console.log(item); //display item contents

    user = await Moralis.User.current();
    const userAddress = user.get('ethAddress');

    switch(createItemStatusField.value){
        case "0":
            return;
        case "1":
            await enusreMarketplaceIsApproved(nftId, TOKEN_CONTRACT_ADDRESS);
            await marketplaceContract.methods.addItemToMarket(nftId, TOKEN_CONTRACT_ADDRESS, createItemPriceField.value).send({from: userAddress});
            break;
        case "2":
            alert("Bidding Not Supprted");
            return;
    }
}

mintNft = async (metadataUrl) => {
    const receipt = await tokenContract.methods.createItem(metadataUrl).send({from: ethereum.selectedAddress});
    console.log(receipt);
    return receipt.events.Transfer.returnValues.tokenId;
}

openUserItems = async () => { 
    user = await Moralis.User.current(); 
    if (user){
        showElement(userItemsSection); //show user item section if user is logged in
    }else{
        login(); 
    }
}

loadUserItems = async () => {
    const ownedItems = await Moralis.Cloud.run("getUserItems");
    ownedItems.forEach(item => {
        getAndRenderItemData(item, renderUserItem);
    });
}

loadItems = async () => {
    const items = await Moralis.Cloud.run("getItems");
    items.forEach(item => {
        getAndRenderItemData(item, renderItem);
    });
}

initTemplate = (id) => {
    const template = document.getElementById(id);
    template.id = "";
    template.parentNode.removeChild(template);
    return template;
}

renderUserItem = (item) => {
    const userItem = userItemTemplate.cloneNode(true);
    userItem.getElementsByTagName("img")[0].src = item.image;
    userItem.getElementsByTagName("img")[0].alt = item.name;
    userItem.getElementsByTagName("h5")[0].src = item.name;
    userItem.getElementsByTagName("p")[0].innerText = item.description;
    userItems.appendChild(userItem);
}

renderItem = (item) => {
    const itemForSale = marketplaceItemTemplate.cloneNode(true);
    if (item.sellerAvatar){
        itemForSale.getElementsByTagName("img")[0].src = item.sellerAvatar.url();
        itemForSale.getElementsByTagName("img")[0].alt = item.sellerUsername;
    }

    itemForSale.getElementsByTagName("img")[1].src = item.image;
    itemForSale.getElementsByTagName("img")[1].alt = item.name;
    itemForSale.getElementsByTagName("h5")[0].innerText = item.name;
    itemForSale.getElementsByTagName("p")[0].innerText = item.description;

    itemForSale.getElementsByTagName("button")[0].innerText = `Buy for ${item.askingPrice}`;

    itemForSale.id = `item-${item.uid}`;
    itemsForSale.appendChild(itemForSale);
}

getAndRenderItemData = (item, renderFunction) => {
    
    fetch(item.tokenUri)
    .then(response => response.json())
    .then(data => {
        item.name = data.name;
        item.description = data.description;
        item.image = data.image;
        renderFunction(item);
    })
}

enusreMarketplaceIsApproved = async (tokenId, tokenAddress) => {
    user = await Moralis.User.current();
    const userAddress = user.get('ethAddress');
    const contract = new web3.eth.Contract(tokenContractAbi, tokenAddress);
    const approvedAddress = await contract.methods.getApproved(tokenId).call({from: userAddress});
    if (approvedAddress != MARKETPLACE_CONTRACT_ADDRESS){
        await contract.methods.approve(MARKETPLACE_CONTRACT_ADDRESS, tokenId).send({from: userAddress});
    }
}

hideElement = (element) => element.style.display = "none";
showElement = (element) => element.style.display = "block";

//NAV BAR
const userConnectButton = document.getElementById("btnConnect"); 
userConnectButton.onclick = login;

const userProfileButton = document.getElementById("btnUserInfo");
userProfileButton.onclick = openUserInfo;

const openCreateItemButton = document.getElementById("btnOpenCreateItem");
openCreateItemButton.onclick = () => showElement(createItemForm);

//USER INFO
const userInfo = document.getElementById("userInfo");
const userUsernameField = document.getElementById("txtUsername");
const userEmailField = document.getElementById("txtEmail");
const userAvatarImg = document.getElementById("imgAvatar");
const userAvatarFile = document.getElementById("fileAvatar");

document.getElementById("btnCloseUserInfo").onclick = () => hideElement(userInfo);
document.getElementById("btnLogout").onclick = logout;
document.getElementById("btnSaveUserInfo").onclick = saveUserInfo;

//NFT CREATION FORM
const createItemForm = document.getElementById("createItem");
const createItemNameField = document.getElementById("txtCreateItemName");
const createItemDescriptionField = document.getElementById("txtCreatItemDescription");
const createItemPriceField = document.getElementById("numCreateItemPrice");
const createItemStatusField = document.getElementById("selectCreateItemStatus");
const createItemFile = document.getElementById("fileCreateItemFile");

document.getElementById("btnCloseCreateItem").onclick = () => hideElement(createItemForm); //hide create item form
document.getElementById("btnCreateItem").onclick = createItem;

//User Items
const userItemsSection = document.getElementById("userItems");
const userItems = document.getElementById("userItemsList");

document.getElementById("btnCloseUserItems").onclick = () => hideElement(userItemsSection);

const openUserItemsButton = document.getElementById("btnMyItems");

openUserItemsButton.onclick = openUserItems;

const userItemTemplate = initTemplate("itemTemplate")
const marketplaceItemTemplate = initTemplate("marketplaceItemTemplate")

//items for sale
const itemsForSale = document.getElementById("itemsForSale");

init();