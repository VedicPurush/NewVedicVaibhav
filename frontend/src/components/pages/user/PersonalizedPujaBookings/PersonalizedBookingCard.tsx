import { paidMoney } from "@/lib/currency";

export interface PersonalizedBookingCardProps {
  orderId: string;
  poojaName: string;
  mandirName?: string;
  devoteeName: string;
  fullName?: string[];
  gotra?: string[];
  mobile: string;
  email: string;
  poojaDate?: string;
  price: number | null;
  /** Presentment fields from the booking record. Receipts must be shown in the
   *  currency the devotee ACTUALLY PAID IN, never re-priced by today's picker. */
  currency?: string | null;
  chargedAmount?: number | null;
  description?: string;
  link?: string | null;
  prasadDeliveryStatus: string;
  paymentStatus: boolean;
  isApproved: boolean;
  isCompleted: boolean;
  createdAt?: string;
}

const fmtDate = (val?: string) => {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return val; }
};

const StatusBadge = ({ label, color }: { label: string; color: string }) => (
  <span
    className="px-3 py-1 rounded-full text-xs font-bold border shadow-sm tracking-wide uppercase"
    style={{ color, borderColor: color, background: `${color}15` }}
  >
    {label}
  </span>
);

const Field = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
  <div>
    <span className="text-xs font-semibold uppercase tracking-wider block mb-0.5" style={{ color: "#d97706" }}>
      {label}
    </span>
    <span className={`text-sm ${accent ? "font-bold text-orange-600" : "font-semibold text-gray-800"}`}>
      {value}
    </span>
  </div>
);

const PersonalizedBookingCard = ({
  orderId, poojaName, mandirName, devoteeName, fullName, gotra,
  mobile, email, poojaDate, price, currency, chargedAmount, description, link,
  prasadDeliveryStatus, paymentStatus, isApproved, isCompleted, createdAt,
}: PersonalizedBookingCardProps) => {
  const safeNames = fullName?.length ? fullName : devoteeName ? [devoteeName] : [];
  const safeGotra = gotra?.length ? gotra : [];

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(249,115,22,0.1)] border border-orange-100/50 hover:shadow-[0_8px_30px_-4px_rgba(249,115,22,0.15)] transition-all duration-300 relative overflow-hidden group p-5 md:p-7">
      {/* Top accent */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 opacity-80 group-hover:opacity-100 transition-opacity" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-0.5 font-['Outfit',sans-serif] flex items-center gap-2">
            <span>🛕</span> {poojaName}
          </h3>
          {mandirName && (
            <p className="text-sm text-gray-500 font-medium">{mandirName}</p>
          )}
          <p className="text-gray-400 text-xs font-medium mt-0.5">
            Order ID: <span className="text-gray-600 font-semibold font-mono">{orderId}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={paymentStatus ? "Paid" : "Payment Pending"}
            color={paymentStatus ? "#15803d" : "#b45309"}
          />
          <StatusBadge
            label={isCompleted ? "Completed" : isApproved ? "Approved" : "Scheduled"}
            color={isCompleted ? "#7c3aed" : isApproved ? "#15803d" : "#1d4ed8"}
          />
        </div>
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-orange-100 to-transparent mb-5" />

      {/* Main details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 mb-5">
        <Field label="Puja Date" value={fmtDate(poojaDate)} />
        <Field label="Mobile" value={`+91 ${mobile}`} />
        <Field
          label="Amount"
          // Shown in the currency this booking was PAID in — see paidMoney().
          value={price !== null ? paidMoney({ amount: price, currency, chargedAmount }) : "To be confirmed"}
          accent={price !== null}
        />
        {email && <Field label="Email" value={email} />}
        {prasadDeliveryStatus && (
          <Field label="Prasad Status" value={prasadDeliveryStatus.charAt(0).toUpperCase() + prasadDeliveryStatus.slice(1)} />
        )}
        {createdAt && <Field label="Booked On" value={fmtDate(createdAt)} />}
      </div>

      {/* Devotees */}
      {safeNames.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#d97706" }}>
            Devotees
          </p>
          <div className="flex flex-wrap gap-2">
            {safeNames.map((name, i) => (
              <div key={i} className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5 text-xs text-gray-700">
                <span className="font-semibold">{name}</span>
                {safeGotra[i] && (
                  <span className="text-gray-400 ml-1">• {safeGotra[i]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="mb-4 bg-orange-50/60 border border-orange-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">Package Details</p>
          <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
        </div>
      )}

      {/* Puja video/photo link */}
      {link && link !== "N/A" && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">View Your Puja</p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 underline hover:text-orange-700"
          >
            🎥 Watch Recording
          </a>
        </div>
      )}

      {/* Completion banner */}
      {isCompleted && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold text-purple-700 flex items-center gap-2 mb-2" style={{ background: "#f3e8ff", border: "1px solid #e9d5ff" }}>
          ✅ Your Personalized Puja has been completed. May divine blessings be upon you 🙏
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
        <div className="flex items-center text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
          <svg className="w-3.5 h-3.5 mr-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Booked on: {fmtDate(createdAt)}
        </div>
      </div>
    </div>
  );
};

export default PersonalizedBookingCard;
