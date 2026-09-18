const Loadinggif = () => {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Not lazy: this is the first thing painted while data loads, so lazy
          loading only delayed the first contentful paint. */}
      <img
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png"
        alt="Loading..."
        style={{ width: "10%" }}
      />
    </div>
  );
};

export default Loadinggif;
