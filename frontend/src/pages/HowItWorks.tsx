import { useState } from 'react'
import Header from '../component/Header'
import Footer from '../component/Footer'

const HowItWorks = () => {
    const [activeTab, setActiveTab] = useState<'customers' | 'ngos'>('customers')


    const customerSteps = [
        {
            number: '01',
            title: 'Search for Product/Campaign',
            description: 'Explore designs, campaigns, and creative works made by talented creators, each one supporting a meaningful cause.'
        },
        {
            number: '02',
            title: 'Choose a Product /Cause You Love',
            description: 'Find a project or campaign that resonates with you from community upliftment to environmental care, and you can also purchase any item you like'
        },
        {
            number: '03',
            title: 'Donate or Purchase',
            description: 'Support by donating directly or purchasing a design. Every contribution helps fund real impact through creativity.'
        },
        {
            number: '04',
            title: "See the Change You're Making",
            description: "Track how your support helps causes grow and lives improve – powered by design and generosity."
        }
    ]

    const ngoSteps = [
        {
            number: '01',
            title: 'Create a Campaign',
            description: 'Explore designs, campaigns, and creative works made by talented creators, each one supporting a meaningful cause.'
        },
        {
            number: '02',
            title: 'Set the Target Price',
            description: 'Find a project or campaign that resonates with you from community upliftment to environmental care, and you can also purchase any item you like'
        },
        {
            number: '03',
            title: 'Upload Campaign',
            description: 'Support by donating directly or purchasing a design. Every contribution helps fund real impact through creativity.'
        },
        {
            number: '04',
            title: 'Get',
            description: "Track how your support helps causes grow and lives improve – powered by design and generosity."
        }
    ]

    const steps = activeTab === 'customers' ? customerSteps : ngoSteps

    return (
        <div>
            <Header />
            
            <section className="px-4 md:px-7 py-16">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-5xl md:text-6xl font-bold">
                            How <span className="text-yellow-400">Donate.</span> Works
                        </h1>
                    </div>

                    <div className="flex justify-center gap-4 mb-16">
                        <button
                            onClick={() => setActiveTab('customers')}
                            className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${
                                activeTab === 'customers'
                                    ? 'bg-yellow-400 text-black'
                                    : 'bg-black text-white'
                            }`}
                        >
                            Customers
                        </button>
                        <button
                            onClick={() => setActiveTab('ngos')}
                            className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${
                                activeTab === 'ngos'
                                    ? 'bg-yellow-400 text-black'
                                    : 'bg-black text-white'
                            }`}
                        >
                            NGO'S
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className="bg-black rounded-3xl p-8 text-white"
                            >
                                <div className="text-6xl font-bold mb-4 text-white">
                                    {step.number}
                                </div>
                                <h3 className="text-2xl font-semibold mb-4 text-white">
                                    {step.title}
                                </h3>
                                <p className="text-base text-white leading-relaxed">
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-300 pt-8">
                        <p className="text-center text-black text-base">
                            NOTE: You can only donate up to 20% to Campaigns after purchasing a design or product
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}

export default HowItWorks

