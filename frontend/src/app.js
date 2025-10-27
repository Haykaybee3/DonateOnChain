const CONTRACTS = {
  CAMPAIGN_REGISTRY: '0x81775344822728c64a9F05b6D70DBa2539021D73',
  DONATION_MANAGER: '0xd0209ca2c827f3fe83ef1d9d34fa9f3c54e0d87b',
};

let provider;
let signer;
let campaignRegistry;
let donationManager;

async function init() {
  const connectBtn = document.getElementById('connectWallet');
  connectBtn.addEventListener('click', connectWallet);
}

async function connectWallet() {
  try {
    if (typeof window.hedera === 'undefined') {
      alert('Please install a Hedera wallet (HashPack, Blade, etc.)');
      return;
    }

    provider = new ethers.providers.Web3Provider(window.hedera);
    signer = provider.getSigner();
    
    const address = await signer.getAddress();
    console.log('Connected:', address);

    campaignRegistry = new ethers.Contract(
      CONTRACTS.CAMPAIGN_REGISTRY,
      [],
      signer
    );

    donationManager = new ethers.Contract(
      CONTRACTS.DONATION_MANAGER,
      [],
      signer
    );

    loadCampaigns();
  } catch (error) {
    console.error('Connection error:', error);
  }
}

async function loadCampaigns() {
  try {
    const count = await campaignRegistry.campaignCount();
    const campaignsDiv = document.getElementById('campaigns');
    
    for (let i = 0; i < count; i++) {
      const campaign = await campaignRegistry.getCampaign(i);
      const campaignEl = document.createElement('div');
      campaignEl.innerHTML = `
        <h3>Campaign ${i}</h3>
        <p>NGO: ${campaign.ngo}</p>
        <p>Designer: ${campaign.designer}</p>
        <button onclick="donate(${i})">Donate</button>
      `;
      campaignsDiv.appendChild(campaignEl);
    }
  } catch (error) {
    console.error('Error loading campaigns:', error);
  }
}

async function donate(campaignId) {
  try {
    const tx = await donationManager.donate(campaignId, '', {
      value: ethers.utils.parseEther('1.0')
    });
    await tx.wait();
    alert('Donation successful!');
  } catch (error) {
    console.error('Donation error:', error);
  }
}

window.addEventListener('load', init);
