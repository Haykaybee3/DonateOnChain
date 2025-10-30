import FooterImg from '../assets/FooterImg.png'
import Button from './Button'

const Footer = () => {
    return (
        <footer className="bg-white px-7 py-10">
            <div className="flex flex-col md:flex-row md:items-start md:gap-8">
                <div className="md:w-[50vw]">
                    <div className="grid grid-cols-3 gap-8">
                    <div>
                        <h4 className="text-sm font-semibold mb-3">Socials</h4>
                        <ul className="space-y-3 text-sm text-black/80">
                            <li>Instagram</li>
                            <li>Facebook</li>
                            <li>Tiktok</li>
                            <li>X</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold mb-3">Shopping</h4>
                        <ul className="space-y-3 text-sm text-black/80">
                            <li>All</li>
                            <li>Bags</li>
                            <li>Shirts</li>
                            <li>Trousers</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold mb-3">Quicklinks</h4>
                        <ul className="space-y-3 text-sm text-black/80">
                            <li>How it works</li>
                            <li>Campaigns</li>
                            <li>Become an NGO</li>
                        </ul>
                    </div>
                    </div>
                </div>
                <div className="md:w-[50vw] mt-6 md:mt-0">
                    <div className="bg-black text-white rounded-lg p-5 md:p-6">
                        <p className="text-sm mb-6">Stay updated : Campaigns, Creators and More.</p>
                        <div className="flex items-center gap-3 border-b border-white/40 pb-4">
                            <input 
                                type="email" 
                                placeholder="Type your Email Address Here" 
                                className="flex-1 bg-transparent text-white placeholder-white/70 text-sm outline-none"
                            />
                            <Button variant="secondary" size="md">SUBMIT</Button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative w-screen left-1/2 right-1/2 -translate-x-1/2 mt-[100px]">
                <img 
                    src={FooterImg} 
                    alt="Donate" 
                    className="block w-screen max-w-none select-none"
                />
            </div>
            <p className="text-gray-500 text-sm mt-1">Copyright 2025 DONATE. All rights reserved</p>
        </footer>
    )
}

export default Footer
