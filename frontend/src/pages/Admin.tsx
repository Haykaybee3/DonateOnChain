import { useState, useEffect } from 'react'
import { useAccount, useWatchContractEvent } from 'wagmi'
import Header from '../component/Header'
import Footer from '../component/Footer'
import Button from '../component/Button'
import { addresses, abis } from '../onchain/contracts'
import { updateNgoApplicationStatus, getNgoApplications, updateDesignerApplicationStatus, getDesignerApplications, saveAdminList, getAdminList, getAllGlobalDesigns, getDesignIndex, getUserProfile, deleteCampaignEverywhere, deleteDesignEverywhere } from '../utils/firebaseStorage'
import { deactivateCampaign, deactivateDesign, deactivateNGO, deactivateDesigner, listActiveCampaignsWithMeta, listAllCampaignsFromChain } from '../onchain/adapter'
import { read } from '../onchain/client'
import { adminAddAdmin, adminRemoveAdmin, adminApproveNgo, adminApproveDesigner, listPendingNgos, listPendingDesigners } from '../onchain/adapter'

const AdminPage = () => {
  const { address, isConnected } = useAccount()
  const [owner, setOwner] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [newAdminAdd, setNewAdminAdd] = useState('')
  const [newAdminRemove, setNewAdminRemove] = useState('')
  const [pendingNgos, setPendingNgos] = useState<string[]>([])
  const [pendingDesigners, setPendingDesigners] = useState<string[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [allNgoApplications, setAllNgoApplications] = useState<any[]>([])
  const [selectedNgo, setSelectedNgo] = useState<any>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [customRejectReason, setCustomRejectReason] = useState('')
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [activeDesignerTab, setActiveDesignerTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [isProcessing, setIsProcessing] = useState(false)
  const [allDesignerApplications, setAllDesignerApplications] = useState<any[]>([])
  const [selectedDesigner, setSelectedDesigner] = useState<any>(null)
  const [showDesignerRejectModal, setShowDesignerRejectModal] = useState(false)
  const [designerRejectReason, setDesignerRejectReason] = useState('')
  const [designerCustomRejectReason, setDesignerCustomRejectReason] = useState('')
  const [adminStats, setAdminStats] = useState({
    totalDonations: 0,
    activeCampaigns: 0,
    activeDesigns: 0,
    activeNgos: 0,
    activeDesigners: 0,
    totalOrders: 0
  })
  const [showDonationsModal, setShowDonationsModal] = useState(false)
  const [showCampaignsDesignsModal, setShowCampaignsDesignsModal] = useState(false)
  const [showCreatorsModal, setShowCreatorsModal] = useState(false)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [showAdminListModal, setShowAdminListModal] = useState(false)
  const [adminList, setAdminList] = useState<string[]>([])
  const [activeCampaignsList, setActiveCampaignsList] = useState<any[]>([])
  const [activeDesignsList, setActiveDesignsList] = useState<any[]>([])
  const [activeNgosList, setActiveNgosList] = useState<any[]>([])
  const [activeDesignersList, setActiveDesignersList] = useState<any[]>([])
  const [campaignPage, setCampaignPage] = useState(0)
  const [designPage, setDesignPage] = useState(0)
  const [ngoPage, setNgoPage] = useState(0)
  const [designerPage, setDesignerPage] = useState(0)
  const [adminPage, setAdminPage] = useState(0)
  const [activeCampaignsDesignTab, setActiveCampaignsDesignTab] = useState<'campaigns' | 'designs'>('campaigns')
  const [activeCreatorsTab, setActiveCreatorsTab] = useState<'ngos' | 'designers'>('ngos')
  const [pendingNgoPage, setPendingNgoPage] = useState(0)
  const [approvedNgoPage, setApprovedNgoPage] = useState(0)
  const [rejectedNgoPage, setRejectedNgoPage] = useState(0)
  const [pendingDesignerPage, setPendingDesignerPage] = useState(0)
  const [approvedDesignerPage, setApprovedDesignerPage] = useState(0)
  const [rejectedDesignerPage, setRejectedDesignerPage] = useState(0)
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null)
  const [deactivatingDesignId, setDeactivatingDesignId] = useState<number | null>(null)

  const rejectReasons = [
    'Incomplete Documentation',
    'Invalid Registration Certificate',
    'Non-compliance with NGO criteria',
    'Duplicate Registration',
    'Suspicious Activity Detected',
    'Insufficient Verification Information',
    'Other'
  ]

  const designerRejectReasons = [
    'Incomplete Portfolio',
    'Low Quality Sample Works',
    'Non-compliance with Designer criteria',
    'Duplicate Application',
    'Suspicious Activity Detected',
    'Insufficient Experience',
    'Fake Portfolio or Social Links',
    'Other'
  ]

  const handleApproveNgo = async (ngoWallet: string) => {
    setIsProcessing(true)
    try {
      const wallet = ngoWallet.toLowerCase()
      const isInPendingList = pendingNgos.some(p => p.toLowerCase() === wallet)
      
      if (!isInPendingList && selectedNgo?.status !== 'pending') {
        setToast({ msg: 'This NGO is not in the pending list or has already been processed.', type: 'error' })
        setIsProcessing(false)
        return
      }

      setToast({ msg: 'Approving NGO...', type: 'success' })
      const receipt = await adminApproveNgo(ngoWallet as `0x${string}`)
      const approvalTxHash = receipt?.hash || receipt?.transactionHash
      
      if (selectedNgo?.walletAddress || selectedNgo?.connectedWalletAddress) {
        await updateNgoApplicationStatus((selectedNgo.walletAddress || selectedNgo.connectedWalletAddress), 'approved', '', approvalTxHash)
      }
      setToast({ msg: 'NGO approved successfully!', type: 'success' })
      setSelectedNgo(null)
      await refreshLists()
      setActiveTab('approved')
      setTimeout(() => {
        setIsProcessing(false)
      }, 500)
    } catch (error: any) {
      setIsProcessing(false)
      const errorMsg = error.message || 'Unknown error'
      if (errorMsg.includes('NGONotPending')) {
        setToast({ msg: 'This NGO is not in pending status. They may have already been processed.', type: 'error' })
      } else {
        setToast({ msg: `Failed to approve NGO: ${errorMsg}`, type: 'error' })
      }
    }
  }

  const handleRejectNgo = async () => {
    if (!rejectReason) {
      setToast({ msg: 'Please select or provide a reason.', type: 'error' })
      return
    }
    const reason = rejectReason === 'Other' ? customRejectReason : rejectReason
    if (rejectReason === 'Other' && !customRejectReason) {
      setToast({ msg: 'Please provide a custom reason.', type: 'error' })
      return
    }
    setIsProcessing(true)
    try {
      setToast({ msg: 'Rejecting NGO application...', type: 'success' })
      if (selectedNgo?.walletAddress || selectedNgo?.connectedWalletAddress) {
        await updateNgoApplicationStatus((selectedNgo.walletAddress || selectedNgo.connectedWalletAddress), 'rejected', reason)
      }
      setToast({ msg: 'NGO application rejected.', type: 'success' })
      setShowRejectModal(false)
      setSelectedNgo(null)
      setRejectReason('')
      setCustomRejectReason('')
      await refreshLists()
      setActiveTab('rejected')
      setTimeout(() => {
        setIsProcessing(false)
      }, 500)
    } catch (error: any) {
      setIsProcessing(false)
      setToast({ msg: `Failed to reject NGO: ${error.message || 'Unknown error'}`, type: 'error' })
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const o = await read<string>({ address: addresses.ADMIN_REGISTRY as `0x${string}`, abi: abis.AdminRegistry as any, functionName: 'owner' })
        setOwner(o as string)
      } catch {}
      try {
        if (address) {
          const a = await read<boolean>({ address: addresses.ADMIN_REGISTRY as `0x${string}`, abi: abis.AdminRegistry as any, functionName: 'isAdmin', args: [address] })
          setIsAdmin(Boolean(a))
        }
      } catch {}
      await refreshLists()
      
      const savedAdmins = await getAdminList()
      setAdminList(savedAdmins)
    }
    load()
  }, [address])

  useWatchContractEvent({
    address: addresses.ADMIN_REGISTRY as any,
    abi: abis.AdminRegistry as any,
    eventName: 'AdminAdded',
    onLogs: async (logs) => {
      const newAdmins = logs.map((log: any) => log.args?.admin).filter(Boolean)
      const currentList = await getAdminList()
      const updatedAdmins = [...new Set([...currentList, ...newAdmins])]
      await saveAdminList(updatedAdmins)
      setAdminList(updatedAdmins)
      setToast({ msg: 'Admin list updated', type: 'success' })
    },
  })

  useWatchContractEvent({
    address: addresses.ADMIN_REGISTRY as any,
    abi: abis.AdminRegistry as any,
    eventName: 'AdminRemoved',
    onLogs: async (logs) => {
      const removedAdmins = logs.map((log: any) => log.args?.admin).filter(Boolean)
      const currentList = await getAdminList()
      const updatedAdmins = currentList.filter((admin: string) => 
        !removedAdmins.some((removed: string) => removed.toLowerCase() === admin.toLowerCase())
      )
      await saveAdminList(updatedAdmins)
      setAdminList(updatedAdmins)
    },
  })


  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const refreshLists = async () => {
    try {
      const ng = await listPendingNgos()
      setPendingNgos(ng as any)
    } catch {}
    try {
      const allApps = await getNgoApplications()
      setAllNgoApplications(allApps || [])
    } catch {}
    try {
      const dg = await listPendingDesigners()
      setPendingDesigners(dg as any)
    } catch {}
    try {
      const allDesignerApps = await getDesignerApplications()
      setAllDesignerApplications(allDesignerApps || [])
    } catch {}
  }

  const loadAdminStats = async () => {
    try {
      const chainCampaigns = await listAllCampaignsFromChain()
      setActiveCampaignsList(chainCampaigns || [])
      
      const allDesignsRaw = await getAllGlobalDesigns()
      const allDesigns = await Promise.all((allDesignsRaw || []).map(async (d: any) => {
        if (d.frontDesign?.url) return d
        try {
          const idx = await getDesignIndex(d.id?.toString())
          const ipfsCid = idx?.previewCid || idx?.designCid || null
          return ipfsCid ? { ...d, previewImageIpfs: ipfsCid } : d
        } catch {
          return d
        }
      }))
      setActiveDesignsList(allDesigns)
      
      const approvedNgos = allNgoApplications.filter(app => app.status === 'approved')
      const approvedDesigners = allDesignerApplications.filter(app => app.status === 'approved')
      setActiveNgosList(approvedNgos)
      const enrichedDesigners = await Promise.all((approvedDesigners || []).map(async (d: any) => {
        const wallet = d.walletAddress || d.connectedWalletAddress
        if (!wallet) return d
        try {
          const profile = await getUserProfile(wallet)
          if (profile?.profileImage) {
            return { ...d, userProfileImage: profile.profileImage }
          }
        } catch {}
        return d
      }))
      setActiveDesignersList(enrichedDesigners)
      
      setAdminStats({
        totalDonations: 0,
        activeCampaigns: chainCampaigns?.length || 0,
        activeDesigns: allDesigns.length,
        activeNgos: approvedNgos.length,
        activeDesigners: approvedDesigners.length,
        totalOrders: 0
      })
    } catch (error) {
      console.error('Error loading admin stats:', error)
    }
  }

  useWatchContractEvent({
    address: addresses.NGO_REGISTRY as any,
    abi: abis.NGORegistry as any,
    eventName: 'NGORegistrationRequested',
    onLogs: async () => {
      await refreshLists()
      setToast({ msg: 'New NGO registration request received.', type: 'success' })
    },
  })

  useWatchContractEvent({
    address: addresses.DESIGNER_REGISTRY as any,
    abi: abis.DesignerRegistry as any,
    eventName: 'DesignerRegistrationRequested',
    onLogs: async () => {
      await refreshLists()
      setToast({ msg: 'New designer registration request received.', type: 'success' })
    },
  })

  const isOwner = isConnected && owner && address && owner.toLowerCase() === address.toLowerCase()

  useEffect(() => {
    if (isAdmin || isOwner) {
      loadAdminStats()
    }
  }, [allNgoApplications, allDesignerApplications, isAdmin, isOwner])

  const handleApproveDesigner = async (designerWallet: string) => {
    setIsProcessing(true)
    try {
      const wallet = designerWallet.toLowerCase()
      const isInPendingList = pendingDesigners.some(p => p.toLowerCase() === wallet)
      const appStatus = selectedDesigner?.status
      
      if (!isInPendingList && appStatus && appStatus !== 'pending') {
        setToast({ msg: 'This designer application has already been processed.', type: 'error' })
        setIsProcessing(false)
        return
      }

      setToast({ msg: 'Approving designer...', type: 'success' })
      const receipt = await adminApproveDesigner(designerWallet as `0x${string}`)
      const approvalTxHash = receipt?.hash || receipt?.transactionHash
      
      if (selectedDesigner?.walletAddress || selectedDesigner?.connectedWalletAddress) {
        await updateDesignerApplicationStatus((selectedDesigner.walletAddress || selectedDesigner.connectedWalletAddress), 'approved', '', approvalTxHash)
      }
      setToast({ msg: 'Designer approved successfully!', type: 'success' })
      setSelectedDesigner(null)
      await refreshLists()
      setActiveDesignerTab('approved')
      setTimeout(() => {
        setIsProcessing(false)
      }, 500)
    } catch (error: any) {
      setIsProcessing(false)
      const errorMsg = error.message || 'Unknown error'
      if (errorMsg.includes('DesignerNotPending')) {
        setToast({ msg: 'This designer is not in pending status. They may have already been processed.', type: 'error' })
      } else {
        setToast({ msg: `Failed to approve designer: ${errorMsg}`, type: 'error' })
      }
    }
  }

  const handleRejectDesigner = async () => {
    if (!designerRejectReason) {
      setToast({ msg: 'Please select or provide a reason.', type: 'error' })
      return
    }
    const reason = designerRejectReason === 'Other' ? designerCustomRejectReason : designerRejectReason
    if (designerRejectReason === 'Other' && !designerCustomRejectReason) {
      setToast({ msg: 'Please provide a custom reason.', type: 'error' })
      return
    }
    setIsProcessing(true)
    try {
      setToast({ msg: 'Rejecting designer application...', type: 'success' })
      if (selectedDesigner?.walletAddress || selectedDesigner?.connectedWalletAddress) {
        await updateDesignerApplicationStatus((selectedDesigner.walletAddress || selectedDesigner.connectedWalletAddress), 'rejected', reason)
      }
      setToast({ msg: 'Designer application rejected.', type: 'success' })
      setShowDesignerRejectModal(false)
      setSelectedDesigner(null)
      setDesignerRejectReason('')
      setDesignerCustomRejectReason('')
      await refreshLists()
      setActiveDesignerTab('rejected')
      setTimeout(() => {
        setIsProcessing(false)
      }, 500)
    } catch (error: any) {
      setIsProcessing(false)
      setToast({ msg: `Failed to reject designer: ${error.message || 'Unknown error'}`, type: 'error' })
    }
  }

  const getNgosByStatus = (status: 'pending' | 'approved' | 'rejected') => {
    if (status === 'pending') {
      const pendingWallets = new Set(pendingNgos.map((w: string) => w.toLowerCase()))
      return allNgoApplications.filter((app: any) => {
        const wallet = (app.walletAddress || app.connectedWalletAddress)?.toLowerCase()
        return wallet && pendingWallets.has(wallet) && app.status !== 'approved' && app.status !== 'rejected'
      })
    }
    return allNgoApplications.filter((app: any) => app.status === status)
  }

  const getDesignersByStatus = (status: 'pending' | 'approved' | 'rejected') => {
    if (status === 'pending') {
      return allDesignerApplications.filter((app: any) => {
        const appStatus = app.status
        return !appStatus || (appStatus !== 'approved' && appStatus !== 'rejected')
      })
    }
    return allDesignerApplications.filter((app: any) => app.status === status)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setToast({ msg: 'Wallet address copied!', type: 'success' })
  }

  return (
    <div>
      <Header />
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          <div className="flex items-center gap-3">
            <span className="text-sm">{toast.msg}</span>
            <button className="text-white/80" onClick={() => setToast(null)}>×</button>
          </div>
        </div>
      )}
      <section className="px-4 md:px-7 py-12 max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-black mb-8">Admin Console</h1>

        {(isAdmin || isOwner) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <div className="bg-black rounded-lg p-6 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setShowCampaignsDesignsModal(true)}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white text-sm font-medium">Campaigns & Designs</h3>
                <button className="text-white/60 hover:text-white text-xs underline">View</button>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-white text-2xl md:text-3xl font-bold">{adminStats.activeCampaigns}</p>
                  <p className="text-white/60 text-xs">Campaigns</p>
                </div>
                <div className="h-12 w-px bg-white/20"></div>
                <div>
                  <p className="text-white text-2xl md:text-3xl font-bold">{adminStats.activeDesigns}</p>
                  <p className="text-white/60 text-xs">Designs</p>
                </div>
              </div>
            </div>
            
            <div className="bg-black rounded-lg p-6 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setShowCreatorsModal(true)}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white text-sm font-medium">NGOs & Designers</h3>
                <button className="text-white/60 hover:text-white text-xs underline">View</button>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-white text-2xl md:text-3xl font-bold">{adminStats.activeNgos}</p>
                  <p className="text-white/60 text-xs">NGOs</p>
                </div>
                <div className="h-12 w-px bg-white/20"></div>
                <div>
                  <p className="text-white text-2xl md:text-3xl font-bold">{adminStats.activeDesigners}</p>
                  <p className="text-white/60 text-xs">Designers</p>
                </div>
              </div>
            </div>

            <div className="bg-black rounded-lg p-6 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setShowDonationsModal(true)}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white text-sm font-medium">Total Donations</h3>
                <button className="text-white/60 hover:text-white text-xs underline">View</button>
              </div>
              <p className="text-white text-3xl md:text-4xl font-bold"><span className="text-lg md:text-xl">HBAR</span> {adminStats.totalDonations.toLocaleString()}</p>
            </div>
            
            <div className="bg-black rounded-lg p-6 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setShowOrdersModal(true)}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white text-sm font-medium">Orders/Purchases</h3>
                <button className="text-white/60 hover:text-white text-xs underline">View</button>
              </div>
              <p className="text-white text-3xl md:text-4xl font-bold">{adminStats.totalOrders}</p>
            </div>
          </div>
        )}

        {isOwner && (
          <div className="mb-10 border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Owner Controls</h2>
              <Button variant="secondary" size="sm" onClick={() => setShowAdminListModal(true)}>Manage Admins</Button>
            </div>
            <div className="flex gap-3 mb-3">
              <input className="flex-1 border rounded px-3 py-2" placeholder="Admin wallet (0x...)" value={newAdminAdd} onChange={(e) => setNewAdminAdd(e.target.value)} />
              <Button variant="primary-bw" onClick={async () => { 
                if (!newAdminAdd) return; 
                try {
                  await adminAddAdmin(newAdminAdd as `0x${string}`);
                  const currentList = await getAdminList()
                  if (!currentList.includes(newAdminAdd)) {
                    const updatedList = [...currentList, newAdminAdd]
                    await saveAdminList(updatedList)
                    setAdminList(updatedList)
                  }
                  setToast({ msg: 'Admin added successfully!', type: 'success' });
                  setNewAdminAdd('');
                } catch (error: any) {
                  setToast({ msg: `Failed to add admin: ${error.message || 'Unknown error'}`, type: 'error' });
                }
              }}>Add Admin</Button>
            </div>
            <div className="flex gap-3">
              <input className="flex-1 border rounded px-3 py-2" placeholder="Admin wallet (0x...)" value={newAdminRemove} onChange={(e) => setNewAdminRemove(e.target.value)} />
              <Button variant="primary-bw" onClick={async () => { 
                if (!newAdminRemove) return; 
                try {
                  await adminRemoveAdmin(newAdminRemove as `0x${string}`);
                  const currentList = await getAdminList()
                  const updatedList = currentList.filter((a: string) => a.toLowerCase() !== newAdminRemove.toLowerCase())
                  await saveAdminList(updatedList)
                  setAdminList(updatedList)
                  setToast({ msg: 'Admin removed successfully!', type: 'success' });
                  setNewAdminRemove('');
                } catch (error: any) {
                  setToast({ msg: `Failed to remove admin: ${error.message || 'Unknown error'}`, type: 'error' });
                }
              }}>Remove Admin</Button>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-10">
            <div className="border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">NGO Applications</h2>
              
              <div className="flex gap-2 mb-6 border-b">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'pending' 
                      ? 'border-yellow-500 text-yellow-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Pending ({getNgosByStatus('pending').length})
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'approved' 
                      ? 'border-green-500 text-green-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Approved ({getNgosByStatus('approved').length})
                </button>
                <button
                  onClick={() => setActiveTab('rejected')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'rejected' 
                      ? 'border-red-500 text-red-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Rejected ({getNgosByStatus('rejected').length})
                </button>
              </div>

              <div className="space-y-2">
                {getNgosByStatus(activeTab).length === 0 && (
                  <p className="text-gray-600 text-center py-8">No {activeTab} NGOs</p>
                )}
                {getNgosByStatus(activeTab).slice(
                  activeTab === 'pending' ? pendingNgoPage * 5 : activeTab === 'approved' ? approvedNgoPage * 5 : rejectedNgoPage * 5,
                  activeTab === 'pending' ? pendingNgoPage * 5 + 5 : activeTab === 'approved' ? approvedNgoPage * 5 + 5 : rejectedNgoPage * 5 + 5
                ).map((ngo: any) => {
                  const walletAddress = ngo.walletAddress || ngo.connectedWalletAddress || 'Unknown'
                  return (
                    <div key={walletAddress} className="border rounded px-3 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{ngo.ngoName || 'Unknown NGO'}</div>
                          <div className="text-xs text-gray-600">{walletAddress.substring(0, 10)}...{walletAddress.substring(walletAddress.length - 8)}</div>
                          <div className="text-xs text-gray-500 mt-1">Country: {ngo.country || '—'}</div>
                        </div>
                        <Button variant="primary-bw" onClick={() => setSelectedNgo(ngo)}>View Details</Button>
                      </div>
                    </div>
                  )
                })}
                {getNgosByStatus(activeTab).length > 5 && (
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => {
                        if (activeTab === 'pending') setPendingNgoPage(Math.max(0, pendingNgoPage - 1))
                        else if (activeTab === 'approved') setApprovedNgoPage(Math.max(0, approvedNgoPage - 1))
                        else setRejectedNgoPage(Math.max(0, rejectedNgoPage - 1))
                      }}
                      disabled={
                        (activeTab === 'pending' && pendingNgoPage === 0) ||
                        (activeTab === 'approved' && approvedNgoPage === 0) ||
                        (activeTab === 'rejected' && rejectedNgoPage === 0)
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        ((activeTab === 'pending' && pendingNgoPage === 0) ||
                        (activeTab === 'approved' && approvedNgoPage === 0) ||
                        (activeTab === 'rejected' && rejectedNgoPage === 0))
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {
                        activeTab === 'pending' ? pendingNgoPage + 1 :
                        activeTab === 'approved' ? approvedNgoPage + 1 :
                        rejectedNgoPage + 1
                      } of {Math.ceil(getNgosByStatus(activeTab).length / 5)}
                    </span>
                    <button
                      onClick={() => {
                        if (activeTab === 'pending') setPendingNgoPage(Math.min(Math.ceil(getNgosByStatus(activeTab).length / 5) - 1, pendingNgoPage + 1))
                        else if (activeTab === 'approved') setApprovedNgoPage(Math.min(Math.ceil(getNgosByStatus(activeTab).length / 5) - 1, approvedNgoPage + 1))
                        else setRejectedNgoPage(Math.min(Math.ceil(getNgosByStatus(activeTab).length / 5) - 1, rejectedNgoPage + 1))
                      }}
                      disabled={
                        (activeTab === 'pending' && pendingNgoPage >= Math.ceil(getNgosByStatus(activeTab).length / 5) - 1) ||
                        (activeTab === 'approved' && approvedNgoPage >= Math.ceil(getNgosByStatus(activeTab).length / 5) - 1) ||
                        (activeTab === 'rejected' && rejectedNgoPage >= Math.ceil(getNgosByStatus(activeTab).length / 5) - 1)
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        ((activeTab === 'pending' && pendingNgoPage >= Math.ceil(getNgosByStatus(activeTab).length / 5) - 1) ||
                        (activeTab === 'approved' && approvedNgoPage >= Math.ceil(getNgosByStatus(activeTab).length / 5) - 1) ||
                        (activeTab === 'rejected' && rejectedNgoPage >= Math.ceil(getNgosByStatus(activeTab).length / 5) - 1))
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Designer Applications</h2>
              
              <div className="flex gap-2 mb-6 border-b">
                <button
                  onClick={() => setActiveDesignerTab('pending')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeDesignerTab === 'pending' 
                      ? 'border-yellow-500 text-yellow-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Pending ({getDesignersByStatus('pending').length})
                </button>
                <button
                  onClick={() => setActiveDesignerTab('approved')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeDesignerTab === 'approved' 
                      ? 'border-green-500 text-green-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Approved ({getDesignersByStatus('approved').length})
                </button>
                <button
                  onClick={() => setActiveDesignerTab('rejected')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeDesignerTab === 'rejected' 
                      ? 'border-red-500 text-red-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Rejected ({getDesignersByStatus('rejected').length})
                </button>
            </div>

              <div className="space-y-2">
                {getDesignersByStatus(activeDesignerTab).length === 0 && (
                  <p className="text-gray-600 text-center py-8">No {activeDesignerTab} designers</p>
                )}
                {getDesignersByStatus(activeDesignerTab).slice(
                  activeDesignerTab === 'pending' ? pendingDesignerPage * 5 : activeDesignerTab === 'approved' ? approvedDesignerPage * 5 : rejectedDesignerPage * 5,
                  activeDesignerTab === 'pending' ? pendingDesignerPage * 5 + 5 : activeDesignerTab === 'approved' ? approvedDesignerPage * 5 + 5 : rejectedDesignerPage * 5 + 5
                ).map((designer: any) => {
                  const walletAddress = designer.walletAddress || designer.connectedWalletAddress || 'Unknown'
                  return (
                    <div key={walletAddress} className="border rounded px-3 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{designer.fullName || designer.username || designer.name || 'Unknown Designer'}</div>
                          <div className="text-xs text-gray-600">{walletAddress.substring(0, 10)}...{walletAddress.substring(walletAddress.length - 8)}</div>
                          <div className="text-xs text-gray-500 mt-1">Country: {designer.country || '—'}</div>
                  </div>
                        <Button variant="primary-bw" onClick={() => setSelectedDesigner(designer)}>View Details</Button>
                      </div>
                  </div>
                  )
                })}
                {getDesignersByStatus(activeDesignerTab).length > 5 && (
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => {
                        if (activeDesignerTab === 'pending') setPendingDesignerPage(Math.max(0, pendingDesignerPage - 1))
                        else if (activeDesignerTab === 'approved') setApprovedDesignerPage(Math.max(0, approvedDesignerPage - 1))
                        else setRejectedDesignerPage(Math.max(0, rejectedDesignerPage - 1))
                      }}
                      disabled={
                        (activeDesignerTab === 'pending' && pendingDesignerPage === 0) ||
                        (activeDesignerTab === 'approved' && approvedDesignerPage === 0) ||
                        (activeDesignerTab === 'rejected' && rejectedDesignerPage === 0)
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        ((activeDesignerTab === 'pending' && pendingDesignerPage === 0) ||
                        (activeDesignerTab === 'approved' && approvedDesignerPage === 0) ||
                        (activeDesignerTab === 'rejected' && rejectedDesignerPage === 0))
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {
                        activeDesignerTab === 'pending' ? pendingDesignerPage + 1 :
                        activeDesignerTab === 'approved' ? approvedDesignerPage + 1 :
                        rejectedDesignerPage + 1
                      } of {Math.ceil(getDesignersByStatus(activeDesignerTab).length / 5)}
                    </span>
                    <button
                      onClick={() => {
                        if (activeDesignerTab === 'pending') setPendingDesignerPage(Math.min(Math.ceil(getDesignersByStatus(activeDesignerTab).length / 5) - 1, pendingDesignerPage + 1))
                        else if (activeDesignerTab === 'approved') setApprovedDesignerPage(Math.min(Math.ceil(getDesignersByStatus(activeDesignerTab).length / 5) - 1, approvedDesignerPage + 1))
                        else setRejectedDesignerPage(Math.min(Math.ceil(getDesignersByStatus(activeDesignerTab).length / 5) - 1, rejectedDesignerPage + 1))
                      }}
                      disabled={
                        (activeDesignerTab === 'pending' && pendingDesignerPage >= Math.ceil(getDesignersByStatus(activeDesignerTab).length / 5) - 1) ||
                        (activeDesignerTab === 'approved' && approvedDesignerPage >= Math.ceil(getDesignersByStatus(activeDesignerTab).length / 5) - 1) ||
                        (activeDesignerTab === 'rejected' && rejectedDesignerPage >= Math.ceil(getDesignersByStatus(activeDesignerTab).length / 5) - 1)
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        ((activeDesignerTab === 'pending' && pendingDesignerPage >= Math.ceil(getDesignersByStatus(activeDesignerTab).length / 5) - 1) ||
                        (activeDesignerTab === 'approved' && approvedDesignerPage >= Math.ceil(getDesignersByStatus(activeDesignerTab).length / 5) - 1) ||
                        (activeDesignerTab === 'rejected' && rejectedDesignerPage >= Math.ceil(getDesignersByStatus(activeDesignerTab).length / 5) - 1))
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!isConnected && (
          <p className="text-gray-600">Connect wallet to access admin console.</p>
        )}
        {isConnected && !isOwner && !isAdmin && (
          <p className="text-gray-600">You do not have admin access.</p>
        )}
      </section>

      {selectedNgo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">NGO Application Details</h2>
              <button onClick={() => { setSelectedNgo(null); setShowRejectModal(false) }} className="text-gray-500 hover:text-black">×</button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">Wallet Address</div>
              <div className="flex items-center gap-2">
                <code className="text-sm text-blue-800 font-mono break-all md:break-normal">
                  <span className="hidden md:inline">{selectedNgo.walletAddress || selectedNgo.connectedWalletAddress || '—'}</span>
                  <span className="md:hidden">
                    {selectedNgo.walletAddress || selectedNgo.connectedWalletAddress 
                      ? `${(selectedNgo.walletAddress || selectedNgo.connectedWalletAddress).substring(0, 10)}...${(selectedNgo.walletAddress || selectedNgo.connectedWalletAddress).substring((selectedNgo.walletAddress || selectedNgo.connectedWalletAddress).length - 8)}`
                      : '—'}
                  </span>
                </code>
                <button
                  onClick={() => copyToClipboard(selectedNgo.walletAddress || selectedNgo.connectedWalletAddress || '')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Organization Name</div>
                <div className="text-black">{selectedNgo.ngoName || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Email</div>
                <div className="text-black">{selectedNgo.email || selectedNgo.contactEmail || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Phone</div>
                <div className="text-black">{selectedNgo.phoneNumber || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Registration Number</div>
                <div className="text-black">{selectedNgo.registrationNumber || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Year Founded</div>
                <div className="text-black">{selectedNgo.yearFounded || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Organization Type</div>
                <div className="text-black">{selectedNgo.organizationType || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Website</div>
                <div className="text-black">{selectedNgo.website || selectedNgo.websiteLink || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Country</div>
                <div className="text-black">{selectedNgo.country || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">State/Region</div>
                <div className="text-black">{selectedNgo.stateRegion || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Address</div>
                <div className="text-black">{selectedNgo.address || selectedNgo.addressInput || '—'}</div>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Focus Areas/Causes</div>
              <div className="text-black">{(selectedNgo.focusAreas || []).join(', ')}</div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="text-sm font-medium text-gray-700 mb-3">Application Documents</div>
            {(selectedNgo.logoHash || selectedNgo.logoUrl) && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm text-gray-700">Logo</span>
                  <a href={`https://gateway.pinata.cloud/ipfs/${selectedNgo.logoHash || selectedNgo.logoUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline hover:text-blue-800">View</a>
              </div>
            )}
              {(selectedNgo.registrationCertHash || selectedNgo.registrationCertUrl) && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm text-gray-700">Registration Certificate</span>
                  <a href={`https://gateway.pinata.cloud/ipfs/${selectedNgo.registrationCertHash || selectedNgo.registrationCertUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline hover:text-blue-800">View</a>
                </div>
              )}
              {(selectedNgo.annualReportHash || selectedNgo.annualReportUrl) && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm text-gray-700">Annual Report</span>
                  <a href={`https://gateway.pinata.cloud/ipfs/${selectedNgo.annualReportHash || selectedNgo.annualReportUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline hover:text-blue-800">View</a>
                </div>
              )}
              {selectedNgo.metadataHash && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm text-gray-700">Complete Metadata</span>
                  <a href={`https://gateway.pinata.cloud/ipfs/${selectedNgo.metadataHash}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline hover:text-blue-800">View</a>
                </div>
              )}
            </div>

            <div className="flex gap-3 items-center justify-between">
            <div className="flex gap-3 items-center">
              {isProcessing ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Processing...</span>
                </div>
              ) : selectedNgo.status === 'approved' ? (
                <div className="text-green-600 font-medium">✓ Approved</div>
              ) : selectedNgo.status === 'rejected' ? (
                <div className="text-red-600 font-medium">✗ Rejected</div>
              ) : (
                <>
                  <Button variant="primary-bw" onClick={() => handleApproveNgo(selectedNgo.walletAddress || selectedNgo.connectedWalletAddress || pendingNgos.find(w => w.toLowerCase() === (selectedNgo.walletAddress || selectedNgo.connectedWalletAddress)?.toLowerCase()) || '')} disabled={isProcessing}>Approve</Button>
                  <Button variant="danger" onClick={() => setShowRejectModal(true)} disabled={isProcessing}>Reject</Button>
                </>
              )}
              </div>
              <a
                href={selectedNgo.approvalTransactionHash 
                  ? `https://hashscan.io/testnet/transaction/${selectedNgo.approvalTransactionHash}` 
                  : selectedNgo.transactionHash 
                  ? `https://hashscan.io/testnet/transaction/${selectedNgo.transactionHash}`
                  : `https://hashscan.io/testnet/account/${selectedNgo.walletAddress || selectedNgo.connectedWalletAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
              >
                View on HashScan
              </a>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-black mb-4">Reject NGO Application</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Rejection</label>
              <select className="w-full border rounded px-3 py-2" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                <option value="">Select a reason</option>
                {rejectReasons.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
            {rejectReason === 'Other' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Reason</label>
                <textarea className="w-full border rounded px-3 py-2" rows={3} value={customRejectReason} onChange={(e) => setCustomRejectReason(e.target.value)} placeholder="Please specify the reason for rejection" />
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="primary-bw" className="flex-1" onClick={handleRejectNgo}>Confirm Rejection</Button>
              <Button variant="secondary" className="flex-1" onClick={() => { setShowRejectModal(false); setRejectReason(''); setCustomRejectReason('') }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {selectedDesigner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Designer Application Details</h2>
              <button onClick={() => { setSelectedDesigner(null); setShowDesignerRejectModal(false) }} className="text-gray-500 hover:text-black">×</button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">Wallet Address</div>
              <div className="flex items-center gap-2">
                <code className="text-sm text-blue-800 font-mono break-all md:break-normal">
                  <span className="hidden md:inline">{selectedDesigner.walletAddress || selectedDesigner.connectedWalletAddress || '—'}</span>
                  <span className="md:hidden">
                    {selectedDesigner.walletAddress || selectedDesigner.connectedWalletAddress 
                      ? `${(selectedDesigner.walletAddress || selectedDesigner.connectedWalletAddress).substring(0, 10)}...${(selectedDesigner.walletAddress || selectedDesigner.connectedWalletAddress).substring((selectedDesigner.walletAddress || selectedDesigner.connectedWalletAddress).length - 8)}`
                      : '—'}
                  </span>
                </code>
                <button
                  onClick={() => copyToClipboard(selectedDesigner.walletAddress || selectedDesigner.connectedWalletAddress || '')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Full Name</div>
                <div className="text-black">{selectedDesigner.fullName || selectedDesigner.name || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Username</div>
                <div className="text-black">{selectedDesigner.username || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Email</div>
                <div className="text-black">{selectedDesigner.email || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Country</div>
                <div className="text-black">{selectedDesigner.country || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Primary Design Field</div>
                <div className="text-black">{selectedDesigner.primaryDesignField || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Experience Level</div>
                <div className="text-black">{selectedDesigner.experienceLevel || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Portfolio Link</div>
                <div className="text-black">{selectedDesigner.portfolioLink || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">LinkedIn</div>
                <div className="text-black">{selectedDesigner.linkedinProfile || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Social Handle</div>
                <div className="text-black">{selectedDesigner.socialHandle || '—'}</div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="text-sm font-medium text-gray-700 mb-3">Portfolio & Documents</div>
              {selectedDesigner.sampleWorkHashes && selectedDesigner.sampleWorkHashes.length > 0 && (
                <div className="space-y-2">
                  {selectedDesigner.sampleWorkHashes.map((hash: string, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <span className="text-sm text-gray-700">Sample Work {index + 1}</span>
                      <a href={`https://gateway.pinata.cloud/ipfs/${hash}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline hover:text-blue-800">View</a>
                    </div>
                  ))}
                </div>
              )}
              {selectedDesigner.verificationDocHash && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm text-gray-700">Verification Document</span>
                  <a href={`https://gateway.pinata.cloud/ipfs/${selectedDesigner.verificationDocHash}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline hover:text-blue-800">View</a>
                </div>
              )}
              {selectedDesigner.metadataHash && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm text-gray-700">Complete Metadata</span>
                  <a href={`https://gateway.pinata.cloud/ipfs/${selectedDesigner.metadataHash}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm underline hover:text-blue-800">View</a>
                </div>
              )}
            </div>

            <div className="flex gap-3 items-center justify-between">
              <div className="flex gap-3 items-center">
                {isProcessing ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Processing...</span>
                  </div>
                ) : (selectedDesigner.status || '') === 'approved' ? (
                  <div className="text-green-600 font-medium">✓ Approved</div>
                ) : (selectedDesigner.status || '') === 'rejected' ? (
                  <div className="text-red-600 font-medium">✗ Rejected</div>
                ) : (
                  <>
                    <Button variant="primary-bw" onClick={() => handleApproveDesigner(selectedDesigner.walletAddress || selectedDesigner.connectedWalletAddress || pendingDesigners.find(w => w.toLowerCase() === (selectedDesigner.walletAddress || selectedDesigner.connectedWalletAddress)?.toLowerCase()) || '')} disabled={isProcessing}>Approve</Button>
                    <Button variant="danger" onClick={() => setShowDesignerRejectModal(true)} disabled={isProcessing}>Reject</Button>
                  </>
                )}
              </div>
              <a
                href={selectedDesigner.approvalTransactionHash 
                  ? `https://hashscan.io/testnet/transaction/${selectedDesigner.approvalTransactionHash}` 
                  : selectedDesigner.transactionHash 
                  ? `https://hashscan.io/testnet/transaction/${selectedDesigner.transactionHash}`
                  : `https://hashscan.io/testnet/account/${selectedDesigner.walletAddress || selectedDesigner.connectedWalletAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
              >
                View on HashScan
              </a>
            </div>
          </div>
        </div>
      )}

      {showDesignerRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-black mb-4">Reject Designer Application</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Rejection</label>
              <select className="w-full border rounded px-3 py-2" value={designerRejectReason} onChange={(e) => setDesignerRejectReason(e.target.value)}>
                <option value="">Select a reason</option>
                {designerRejectReasons.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
            {designerRejectReason === 'Other' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Reason</label>
                <textarea className="w-full border rounded px-3 py-2" rows={3} value={designerCustomRejectReason} onChange={(e) => setDesignerCustomRejectReason(e.target.value)} placeholder="Please specify the reason for rejection" />
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="primary-bw" className="flex-1" onClick={handleRejectDesigner}>Confirm Rejection</Button>
              <Button variant="secondary" className="flex-1" onClick={() => { setShowDesignerRejectModal(false); setDesignerRejectReason(''); setDesignerCustomRejectReason('') }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {showDonationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Total Donations</h2>
              <button onClick={() => setShowDonationsModal(false)} className="text-gray-500 hover:text-black">×</button>
            </div>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No donations yet</h3>
              <p className="text-gray-500">Donation records will appear here</p>
            </div>
          </div>
        </div>
      )}

      {showCampaignsDesignsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Campaigns & Designs</h2>
              <button onClick={() => setShowCampaignsDesignsModal(false)} className="text-gray-500 hover:text-black">×</button>
            </div>

            <div className="mb-6 border-b border-gray-200">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveCampaignsDesignTab('campaigns')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeCampaignsDesignTab === 'campaigns'
                      ? 'border-b-2 border-black text-black'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  Campaigns ({activeCampaignsList.length})
                </button>
                <button
                  onClick={() => setActiveCampaignsDesignTab('designs')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeCampaignsDesignTab === 'designs'
                      ? 'border-b-2 border-black text-black'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  Designs ({activeDesignsList.length})
                </button>
              </div>
            </div>

            {activeCampaignsDesignTab === 'campaigns' ? (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-black">📢 Active Campaigns ({activeCampaignsList.length})</h3>
                </div>
                {activeCampaignsList.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {activeCampaignsList.slice(campaignPage * 10, campaignPage * 10 + 10).map((campaign: any) => (
                      <div key={campaign.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            {(campaign.image || campaign.coverImageFile) && (
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                <img 
                                  src={campaign.image || campaign.coverImageFile} 
                                  alt={campaign.title} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold text-black">{campaign.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{campaign.description?.substring(0, 100)}...</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>Goal: <span className="text-[10px]">HBAR</span> {campaign.goal}</span>
                                <span>Raised: <span className="text-[10px]">HBAR</span> {campaign.amountRaised || 0}</span>
                                <span>NGO: {campaign.ngoName || '—'}</span>
                              </div>
                            </div>
                          </div>
                          {campaign.active !== false ? (
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
                              <button
                                className="px-3 py-1 text-xs rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                                onClick={async () => {
                                  try {
                                    let numericId: number | null = null
                                    const rawId = campaign.onchainId || campaign.id
                                    if (typeof rawId === 'number' && rawId < 1e9) {
                                      numericId = rawId
                                    } else if (typeof rawId === 'string' && /^\d+$/.test(rawId) && Number(rawId) < 1e9) {
                                      numericId = Number(rawId)
                                    }

                                    if (numericId == null) {
                                      try {
                                        const activeWithMeta = await listActiveCampaignsWithMeta()
                                        const matched = activeWithMeta.find((c: any) => (c.title || '').trim() === (campaign.title || '').trim())
                                        if (matched) numericId = matched.id
                                      } catch {}
                                    }

                                    if (numericId == null) {
                                      console.error('Unable to resolve on-chain campaign ID for', campaign.title)
                                      return
                                    }
                                    setDeactivatingId(numericId)
                                    await deactivateCampaign(BigInt(numericId))
                                    await deleteCampaignEverywhere(numericId)
                                    setActiveCampaignsList(prev => prev.filter((c: any) => (c.onchainId || c.id) !== numericId))
                                    setToast({ msg: 'Campaign deactivated successfully', type: 'success' })
                                  } catch (e) {
                                    console.error('Failed to deactivate campaign', e)
                                    setToast({ msg: 'Failed to deactivate campaign', type: 'error' })
                                  }
                                  finally { setDeactivatingId(null) }
                                }}
                              >
                                Deactivate
                              </button>
                            </div>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Inactive</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => setCampaignPage(Math.max(0, campaignPage - 1))}
                      disabled={campaignPage === 0}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${campaignPage === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">Page {campaignPage + 1} of {Math.ceil(activeCampaignsList.length / 10)}</span>
                    <button
                      onClick={() => setCampaignPage(Math.min(Math.ceil(activeCampaignsList.length / 10) - 1, campaignPage + 1))}
                      disabled={campaignPage >= Math.ceil(activeCampaignsList.length / 10) - 1}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${campaignPage >= Math.ceil(activeCampaignsList.length / 10) - 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No active campaigns</p>
                </div>
              )}
            </div>
            ) : (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black">🎨 Active Designs ({activeDesignsList.length})</h3>
              </div>
              {activeDesignsList.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {activeDesignsList.slice(designPage * 10, designPage * 10 + 10).map((design: any, index: number) => {
                      const thumbnailUrl = design.frontDesign?.url || 
                        (design.previewImageIpfs ? `https://ipfs.io/ipfs/${design.previewImageIpfs}` : null) ||
                        (design.frontDesign?.dataUrl || null)
                      return (
                      <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            {thumbnailUrl && (
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                <img 
                                  src={thumbnailUrl} 
                                  alt={design.pieceName || 'Design'} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold text-black">{design.pieceName}</h4>
                              <p className="text-sm text-gray-600 mt-1">Campaign: {design.campaign}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>Price: {design.price} HBAR</span>
                                <span>Type: {design.type}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            Design
                          </span>
                            <button
                              className="px-3 py-1 text-xs rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                              onClick={async () => {
                                try {
                                  const designId = design.onchainId || design.id
                                  if (!designId) {
                                    console.error('Unable to resolve design ID for', design.pieceName)
                                    return
                                  }
                                  const numericId = typeof designId === 'number' ? designId : Number(designId)
                                  if (isNaN(numericId)) {
                                    console.error('Invalid design ID:', designId)
                                    return
                                  }
                                  setDeactivatingDesignId(numericId)
                                  await deactivateDesign(BigInt(numericId))
                                  await deleteDesignEverywhere(numericId)
                                  setActiveDesignsList(prev => prev.filter((d: any) => (d.onchainId || d.id) !== numericId))
                                  setToast({ msg: 'Design deactivated successfully', type: 'success' })
                                } catch (e) {
                                  console.error('Failed to deactivate design', e)
                                  setToast({ msg: 'Failed to deactivate design', type: 'error' })
                                } finally {
                                  setDeactivatingDesignId(null)
                                }
                              }}
                            >
                              Deactivate
                            </button>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => setDesignPage(Math.max(0, designPage - 1))}
                      disabled={designPage === 0}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${designPage === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">Page {designPage + 1} of {Math.ceil(activeDesignsList.length / 10)}</span>
                    <button
                      onClick={() => setDesignPage(Math.min(Math.ceil(activeDesignsList.length / 10) - 1, designPage + 1))}
                      disabled={designPage >= Math.ceil(activeDesignsList.length / 10) - 1}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${designPage >= Math.ceil(activeDesignsList.length / 10) - 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No designs created yet</p>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {showCreatorsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">NGOs & Designers</h2>
              <button onClick={() => setShowCreatorsModal(false)} className="text-gray-500 hover:text-black">×</button>
            </div>

            <div className="mb-6 border-b border-gray-200">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveCreatorsTab('ngos')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeCreatorsTab === 'ngos'
                      ? 'border-b-2 border-black text-black'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  NGOs ({activeNgosList.length})
                </button>
                <button
                  onClick={() => setActiveCreatorsTab('designers')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeCreatorsTab === 'designers'
                      ? 'border-b-2 border-black text-black'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  Designers ({activeDesignersList.length})
                </button>
              </div>
            </div>

            {activeCreatorsTab === 'ngos' ? (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-black">🏢 Active NGOs ({activeNgosList.length})</h3>
                </div>
                {activeNgosList.length > 0 ? (
                  <>
                    <div className="space-y-3">
                    {activeNgosList.slice(ngoPage * 10, ngoPage * 10 + 10).map((ngo: any, index: number) => {
                      const thumb = ngo.logoUrl || (ngo.logoHash ? `https://gateway.pinata.cloud/ipfs/${ngo.logoHash}` : null) || ngo.profileImage || ngo.bannerImage || null
                      return (
                      <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {thumb && (
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                <img src={thumb} alt={ngo.ngoName || 'NGO'} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                              </div>
                            )}
                            <div>
                              <h4 className="font-semibold text-black">{ngo.ngoName || 'Unknown'}</h4>
                              <p className="text-sm text-gray-600">{ngo.walletAddress?.substring(0, 10)}...{ngo.walletAddress?.substring(ngo.walletAddress.length - 8)}</p>
                              <p className="text-xs text-gray-500 mt-1">{ngo.country || '—'} • {ngo.organizationType || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">NGO</span>
                            <button
                              className="px-3 py-1 text-xs rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                              onClick={async () => {
                                try {
                                  const wallet = (ngo.walletAddress || ngo.connectedWalletAddress || '').toLowerCase()
                                  if (!wallet) return
                                  setIsProcessing(true)
                                  await deactivateNGO(wallet as `0x${string}`)
                                  setActiveNgosList(prev => prev.filter((n: any) => (n.walletAddress || n.connectedWalletAddress)?.toLowerCase() !== wallet))
                                  setToast({ msg: 'NGO deactivated successfully', type: 'success' })
                                } catch (e) {
                                  console.error('Failed to deactivate NGO', e)
                                  setToast({ msg: 'Failed to deactivate NGO', type: 'error' })
                                } finally {
                                  setIsProcessing(false)
                                }
                              }}
                            >
                              Deactivate
                            </button>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => setNgoPage(Math.max(0, ngoPage - 1))}
                      disabled={ngoPage === 0}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${ngoPage === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">Page {ngoPage + 1} of {Math.ceil(activeNgosList.length / 10)}</span>
                    <button
                      onClick={() => setNgoPage(Math.min(Math.ceil(activeNgosList.length / 10) - 1, ngoPage + 1))}
                      disabled={ngoPage >= Math.ceil(activeNgosList.length / 10) - 1}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${ngoPage >= Math.ceil(activeNgosList.length / 10) - 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No approved NGOs</p>
                </div>
              )}
            </div>
            ) : (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black">🎨 Active Designers ({activeDesignersList.length})</h3>
              </div>
              {activeDesignersList.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {activeDesignersList.slice(designerPage * 10, designerPage * 10 + 10).map((designer: any, index: number) => {
                      const pickUrl = (val: string | null | undefined): string | null => {
                        if (!val) return null
                        if (val.startsWith('http')) return val
                        if (val.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${val.replace('ipfs://', '')}`
                        return `https://ipfs.io/ipfs/${val}`
                      }
                      const thumb =
                        pickUrl(designer.userProfileImage) ||
                        pickUrl(designer.image) ||
                        pickUrl(designer.profileImageUrl) ||
                        pickUrl(designer.profileImage) ||
                        pickUrl(designer.profileImageHash) ||
                        pickUrl(designer.profileCid)
                      return (
                      <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {thumb && (
                              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                <img src={thumb} alt={designer.fullName || designer.name || 'Designer'} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                              </div>
                            )}
                            <div>
                              <h4 className="font-semibold text-black">{designer.fullName || designer.name || 'Unknown'}</h4>
                              <p className="text-sm text-gray-600">{designer.walletAddress?.substring(0, 10)}...{designer.walletAddress?.substring(designer.walletAddress.length - 8)}</p>
                              <p className="text-xs text-gray-500 mt-1">{designer.country || '—'} • {designer.primaryDesignField || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Designer</span>
                            <button
                              className="px-3 py-1 text-xs rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                              onClick={async () => {
                                try {
                                  const wallet = (designer.walletAddress || designer.connectedWalletAddress || '').toLowerCase()
                                  if (!wallet) return
                                  setIsProcessing(true)
                                  await deactivateDesigner(wallet as `0x${string}`)
                                  setActiveDesignersList(prev => prev.filter((d: any) => (d.walletAddress || d.connectedWalletAddress)?.toLowerCase() !== wallet))
                                  setToast({ msg: 'Designer deactivated successfully', type: 'success' })
                                } catch (e) {
                                  console.error('Failed to deactivate designer', e)
                                  setToast({ msg: 'Failed to deactivate designer', type: 'error' })
                                } finally {
                                  setIsProcessing(false)
                                }
                              }}
                            >
                              Deactivate
                            </button>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => setDesignerPage(Math.max(0, designerPage - 1))}
                      disabled={designerPage === 0}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${designerPage === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">Page {designerPage + 1} of {Math.ceil(activeDesignersList.length / 10)}</span>
                    <button
                      onClick={() => setDesignerPage(Math.min(Math.ceil(activeDesignersList.length / 10) - 1, designerPage + 1))}
                      disabled={designerPage >= Math.ceil(activeDesignersList.length / 10) - 1}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${designerPage >= Math.ceil(activeDesignersList.length / 10) - 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No approved designers</p>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {showOrdersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Orders & Purchases</h2>
              <button onClick={() => setShowOrdersModal(false)} className="text-gray-500 hover:text-black">×</button>
            </div>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛍️</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No orders yet</h3>
              <p className="text-gray-500">Order records will appear here</p>
            </div>
          </div>
        </div>
      )}

      {showAdminListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Manage Admins</h2>
              <button onClick={() => setShowAdminListModal(false)} className="text-gray-500 hover:text-black">×</button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black">Current Admins ({adminList.length})</h3>
              </div>
              {adminList.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {adminList.slice(adminPage * 10, adminPage * 10 + 10).map((admin, index) => (
                      <div key={index} className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <code className="text-sm text-gray-800 font-mono">{admin}</code>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await adminRemoveAdmin(admin as `0x${string}`);
                              const currentList = await getAdminList()
                              const updatedList = currentList.filter((a: string) => a.toLowerCase() !== admin.toLowerCase())
                              await saveAdminList(updatedList)
                              setAdminList(updatedList)
                              setAdminPage(Math.max(0, adminPage - 1))
                              setToast({ msg: 'Admin removed successfully!', type: 'success' });
                            } catch (error: any) {
                              setToast({ msg: `Failed to remove admin: ${error.message}`, type: 'error' });
                            }
                          }}
                          className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => setAdminPage(Math.max(0, adminPage - 1))}
                      disabled={adminPage === 0}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${adminPage === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">Page {adminPage + 1} of {Math.ceil(adminList.length / 10)}</span>
                    <button
                      onClick={() => setAdminPage(Math.min(Math.ceil(adminList.length / 10) - 1, adminPage + 1))}
                      disabled={adminPage >= Math.ceil(adminList.length / 10) - 1}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${adminPage >= Math.ceil(adminList.length / 10) - 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No admins added yet</p>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Admin</h3>
              <div className="flex gap-3">
                <input 
                  className="flex-1 border rounded px-3 py-2" 
                  placeholder="Admin wallet (0x...)" 
                  value={newAdminAdd} 
                  onChange={(e) => setNewAdminAdd(e.target.value)} 
                />
                <Button variant="primary-bw" onClick={async () => { 
                  if (!newAdminAdd) return; 
                  try {
                    await adminAddAdmin(newAdminAdd as `0x${string}`);
                    const currentList = await getAdminList()
                    if (!currentList.includes(newAdminAdd)) {
                      const updatedList = [...currentList, newAdminAdd]
                      await saveAdminList(updatedList)
                      setAdminList(updatedList)
                    }
                    setToast({ msg: 'Admin added successfully!', type: 'success' });
                    setNewAdminAdd('');
                  } catch (error: any) {
                    setToast({ msg: `Failed to add admin: ${error.message || 'Unknown error'}`, type: 'error' });
                  }
                }}>Add</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deactivatingId != null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-black animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Deactivating Campaign</h2>
            <p className="text-gray-600">Please wait while we deactivate campaign #{deactivatingId}...</p>
          </div>
        </div>
      )}

      {deactivatingDesignId != null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-black animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Deactivating Design</h2>
            <p className="text-gray-600">Please wait while we deactivate design #{deactivatingDesignId}...</p>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default AdminPage


