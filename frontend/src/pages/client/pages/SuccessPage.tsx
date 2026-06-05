import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Check, Home, Calendar } from "lucide-react";

const SuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const date = searchParams.get("date") || "";
  const total = parseInt(searchParams.get("total") || "0", 10);
  const dietCount = parseInt(searchParams.get("dietCount") || "0", 10);

  const [remaining, setRemaining] = useState(3);

  useEffect(() => {
    if (remaining <= 0) {
      navigate("/home", { replace: true });
      return;
    }
    const t = setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, navigate]);

  const dateLabel = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("sk-SK", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <div className="zp-app" style={{ height: "100%" }}>
      <div className="zp-success" style={{ height: "100%", minHeight: "100vh" }}>
        <div className="badge">
          <Check style={{ width: 50, height: 50, strokeWidth: 2.2 }} />
        </div>

        <h2>Objednávka odoslaná</h2>
        <p>Ďakujeme za Vašu objednávku. Pripravíme ju presne tak, ako ste si želali.</p>

        {(date || total > 0) && (
          <div className="receipt">
            {dateLabel && <div className="when">{dateLabel}</div>}
            <div className="chips">
              {total > 0 && <span className="zp-mchip zp-mchip--lunch">{total} porcií</span>}
              {dietCount > 0 && <span className="zp-mchip zp-mchip--olovrant">{dietCount} diéty</span>}
            </div>
          </div>
        )}

        <div className="zp-success-actions">
          <button
            className="zp-btn zp-btn--primary zp-btn--block zp-btn--lg"
            onClick={() => navigate("/home")}
          >
            <Home style={{ width: 16, height: 16 }} />
            Späť na domov ({remaining}s)
          </button>
          {date && (
            <Link
              to={`/order?date=${date}`}
              className="zp-btn zp-btn--ghost zp-btn--block"
              onClick={() => setRemaining(999)}
            >
              <Calendar style={{ width: 16, height: 16 }} />
              Zobraziť objednávku
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
