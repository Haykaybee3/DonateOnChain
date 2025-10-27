const CONTRACTS = {
  CAMPAIGN_REGISTRY: '0x6016321E000976176766f0fDD1D589462cA1d741',
  DONATION_MANAGER: '0x4de26c586644E3Fb64bE8b52cA3944Dae637882d',
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
