import splashImage from '../assets/splash-promo.jpg'

export default function SplashScreen({ fadingOut }) {
  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#7a1f3d] transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/*
        background-size: cover + background-position: center is what handles
        mobile here, not a second image. The source image is a wide desktop
        grid (about 1.5:1). On a tall narrow phone screen, "cover" scales it
        up until it fills the height, which crops in tightly on the exact
        horizontal center, which is where the TrainLive logo and "Grab a
        Coffee" text already sit. So the branded middle stays framed and
        legible on any screen size, without ever editing the image itself.
      */}
      <div
        className="w-full h-full bg-cover bg-center animate-splash-zoom"
        style={{ backgroundImage: `url(${splashImage})` }}
      />
    </div>
  )
}
