"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { orderRequestFields, useMoney } from "@/lib/currency";

const ChadhavaCheckout: React.FC = () => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const router = useRouter();

  // Navigation state (old `useLocation().state`) is passed via sessionStorage.
  const [navState, setNavState] = useState<any | null>(null);
  useEffect(() => {
    let s: any = {};
    try {
      s = JSON.parse(sessionStorage.getItem("vv_chadhava_checkout_state") ?? "{}");
    } catch {
      // ignore parse errors — behave like a direct visit with no state
    }
    setNavState(s ?? {});
  }, []);

  const [whatsapp, setWhatsapp] = useState("");
  const [name, setName] = useState("");
  const [family, setFamily] = useState<string[]>([]);
  const [gotra, setGotra] = useState("");
  const [dontKnowGotra, setDontKnowGotra] = useState(false);
  const [address, setAddress] = useState({
    address1: "",
    postal: "",
    city: "",
    state: "",
  });

  if (navState === null) return null;

  const {
    needPrasad = false,
    prasad,
    puja,
    accessories,
    totalPrice,
  } = navState || {};

  // Add member
  const addFamilyMember = () => setFamily((f) => [...f, ""]);
  const removeFamilyMember = (idx: number) => setFamily((f) => f.filter((_, i) => i !== idx));
  const updateFamilyMember = (idx: number, value: string) => setFamily((f) => f.map((v, i) => (i === idx ? value : v)));

  const handlePay = async () => {
    if (!name || !whatsapp) {
      alert("Please provide your name and WhatsApp number.");
      return;
    }
    if (needPrasad && (!address.address1 || !address.postal || !address.city || !address.state)) {
      alert("Please provide a complete delivery address for the Prasad.");
      return;
    }

    const referralCode = localStorage.getItem('vedicvaibhav_ref_code');

    const finalTotalPrice = totalPrice + family.length * 50;

    const bookingData = {
      // Presentment request only — totalPrice stays the India list total and the
      // server applies the foreign markup. See lib/currency.ts.
      ...orderRequestFields(),
      chadhavaDetails: puja,
      offerings: accessories,
      prasadDetails: needPrasad ? prasad : null,
      name: name,
      whatsapp: whatsapp,
      family: family,
      gotra: dontKnowGotra ? "Not Provided" : gotra || "Not Provided",
      address: address,
      totalPrice: finalTotalPrice,
      referralCode: referralCode
    };

    const userObject = {
      user: {
        _id: "", // No user ID yet from WebEngage
        email_verified: false,
        name: name,
        phone: whatsapp,
        addedOn: new Date().toISOString(),
        isActive: true,
        isFromApp: false,
        isNotifyOkay: false,
        __v: 0
      }
    };

    // Save to localStorage
    localStorage.setItem("userDetails", JSON.stringify(userObject));

    try {
      const response = await api.post('/chadhava/initiate-payment', bookingData);

      if (response.data.paymentUrl) {
        window.location.href = response.data.paymentUrl;
        localStorage.setItem("bookingId", response.data.bookingId);
        localStorage.setItem("bookedpujaID", response.data.chadhavaId);

      } else {
        alert('Failed to initiate payment. Please try again.');
      }
    } catch (error) {
      console.error("Payment initiation failed:", error);
      alert("An error occurred while connecting to the payment server.");
    }
  };

  return (
    <div className="bg-orange-50 min-h-screen pb-32">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <button className="mb-3 text-[#B91C1C]" onClick={() => router.back()}>
          ← Back
        </button>
        <h1 className="text-2xl font-extrabold mb-4">Checkout</h1>
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="font-bold text-[#B91C1C]">
            {puja?.title}
          </div>
          <div className="text-sm text-slate-700 mb-1">
            {accessories?.map((a: any) => a.name).join(", ")}
            {needPrasad && prasad ? `, ${prasad.name}` : ""}
          </div>
          <div className="text-xs text-slate-600">{puja?.temple}</div>
          <div className="text-xs text-slate-600 mb-2">
            {puja?.date ? new Date(puja.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </div>
          <div className="font-bold text-lg text-[#B91C1C] mb-2">{money(totalPrice + family.length * 50)}</div>
          <div className="flex gap-2">
            <button className="border border-[#B91C1C] px-4 py-1 rounded-full text-[#B91C1C]">Edit</button>
            <button className="border border-[#B91C1C] px-4 py-1 rounded-full text-[#B91C1C]">Remove</button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-1">Enter whatsapp number</label>
          <div className="flex items-center gap-2">
            <span className="bg-green-100 text-green-700 rounded px-2 py-1">🇮🇳 +91</span>
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="border p-2 rounded flex-1" type="tel" placeholder="Enter mobile number" />
          </div>
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-1">Enter your name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="border p-2 rounded w-full" type="text" placeholder="Will be recited during sewa" />
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-1">
            Add Family Members - <span className="font-normal">{money(50)} per member</span>
          </label>
          <div className="text-xs text-slate-600 mb-1">
            Seva will be performed in these names.
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 text-xs mb-2 rounded">
            Add a member for an additional charge of {money(50)} per member.
          </div>
          {family.map((member, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input value={member} onChange={(e) => updateFamilyMember(idx, e.target.value)} className="border p-2 rounded flex-1" type="text" placeholder={`Member ${idx + 1} name`} />
              <button className="text-red-600 font-bold" onClick={() => removeFamilyMember(idx)}>Remove</button>
            </div>
          ))}
          <button className="border px-4 py-1 rounded-full text-[#B91C1C] mt-2" onClick={addFamilyMember}>+ Add member</button>
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-1">Gotra of member</label>
          <input value={gotra} onChange={(e) => setGotra(e.target.value)} disabled={dontKnowGotra} className="border p-2 rounded w-full" type="text" placeholder="Enter gotra" />
          <div>
            <label className="inline-flex items-center mt-1 text-xs">
              <input type="checkbox" checked={dontKnowGotra} onChange={(e) => setDontKnowGotra(e.target.checked)} className="mr-1" />
              Don&apos;t know my gotra
            </label>
          </div>
        </div>

        {needPrasad && (
          <div className="mb-4">
            <label className="block font-bold mb-1">Address</label>
            <div className="text-xs text-slate-600 mb-2">Prasad will be delivered to this address</div>
            <input className="border p-2 rounded w-full mb-2" placeholder="House number and street name" value={address.address1} onChange={e => setAddress(a => ({ ...a, address1: e.target.value }))} />
            <input className="border p-2 rounded w-full mb-2" placeholder="Postal Code" value={address.postal} onChange={e => setAddress(a => ({ ...a, postal: e.target.value }))} />
            <div className="flex gap-2 mb-2">
              <input className="border p-2 rounded flex-1" placeholder="Enter City" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} />
              <input className="border p-2 rounded flex-1" placeholder="Enter State" value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} />
            </div>
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex items-center justify-between z-30">
        <div>
          <div className="text-xs text-slate-500">Total price</div>
          <div className="font-extrabold text-lg">{money(totalPrice + family.length * 50)}</div>
        </div>
        <button className="bg-[#B91C1C] hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold" onClick={handlePay}>Pay now</button>
      </div>
    </div>
  );
};

export default ChadhavaCheckout;
