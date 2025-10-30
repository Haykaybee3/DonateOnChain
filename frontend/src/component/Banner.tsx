import Clothimg from "../assets/Clothimg.png";


const Banner = () => {
    return (
        <section className="px-4 md:px-8 py-12">
<div className="bg-black rounded-3xl overflow-hidden">
  <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
    <div className="relative flex justify-center items-center h-[350px] xl:h-[650px]">
     
      <img
        src={Clothimg}
        alt="T-shirt"
        className="absolute w-[80%] md:w-[75%]  left-[5%] top-[-10%] object-contain z-10"
      />
    </div>

    <div className="p-8 md:p-12 text-white flex flex-col justify-center">
      <h3
        className="font-semibold leading-tight mb-6 text-4xl md:text-5xl"
        style={{
          fontFamily: "Legian Typeface",
          fontWeight: 400,
          letterSpacing: "-0.03em",
        }}
      >
        Design Your Own Merch
      </h3>
      <p
        className="text-lg md:text-xl mb-8 max-w-lg"
        style={{
          fontFamily: "Gellix",
          fontWeight: 400,
          lineHeight: "28px",
        }}
      >
        Design with purpose turn your creativity into meaningful contributions that support real-world causes.
      </p>
      <button className="bg-white text-black rounded-full px-6 py-3 text-sm font-semibold w-fit hover:bg-gray-100 transition">
        Get Started
      </button>
    </div>
  </div>
</div>
</section>
    )
}


export default Banner