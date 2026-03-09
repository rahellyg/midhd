import { useTranslation } from "react-i18next";

export default function SiteCredit() {
  const { t } = useTranslation();

  return (
    <div className="px-4 pb-6 pt-3 text-center">
      <p className="text-sm text-[#6B9B8A]">
        {t("siteCredit.createdBy")} {" "}
        <a
          href="https://rahellyg.github.io/busipro/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline hover:opacity-80"
        >
          {t("siteCredit.brand")}
        </a>
      </p>
    </div>
  );
}
