export default function NewsPortalMarquee() {
  const newsLogos = [
    {
      name: "Business Standard",
      url: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/featuredlogo/Logo1.png",
    },
    {
      name: "Dailyhunt",
      url: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/featuredlogo/logo2.png",
    },
    {
      name: "Lokmat",
      url: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/featuredlogo/Logo3.png",
    },
    {
      name: "Republic India",
      url: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/featuredlogo/logo4.png",
    },
    {
      name: "UNI News",
      url: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/featuredlogo/logo5.png",
    },
    {
      name: "In Business Times",
      url: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/featuredlogo/logo6.png",
    },
    {
      name: "In Business Times",
      url: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/featuredlogo/logo7.png",
    },
  ];

  // Duplicate the logos for seamless loop
  const duplicatedLogos = [...newsLogos, ...newsLogos];

  return (
    <div className=" py-6 px-4 overflow-hidden">
      <div className="max-w-8xl mx-auto px-4 md:px-32">
        <h2 className="text-red-700 text-center text-xl md:text-3xl font-semibold mb-6">
          Featured on 200+ News Portal
        </h2>

        <div className="bg-gradient-to-r from-white via-white  to-orange-500 rounded-full p-1">
          <div className="relative bg-gradient-to-r from-orange-400 to-orange-100 rounded-full py-2 md:py-4 px-0 md:px-6 shadow-lg overflow-hidden">
            <div className="flex animate-scroll">
              {duplicatedLogos.map((logo, index) => (
                <div
                  key={index}
                  className="min-w-[90px] md:min-w-[120px]  mx-0 md:mx-1 flex items-center justify-center"
                >
                  <img
                    loading="lazy"
                    src={logo.url}
                    alt={logo.name}
                    className="h-7 md:h-14 object-contain transition-all duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          animation: scroll 20s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
