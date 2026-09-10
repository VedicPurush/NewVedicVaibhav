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
      <img
        loading="lazy"
        src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/logo/vvfinallogo.png"
        alt="Loading..."
        style={{ width: "10%" }}
      />
    </div>
  );
};

export default Loadinggif;
