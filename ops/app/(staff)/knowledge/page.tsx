import { prisma } from "@/lib/db";
import { getLocale, localized, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const locale = await getLocale();
  const articles = await prisma.knowledgeArticle.findMany({ orderBy: { title: "asc" } });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.6rem" }}>{t(locale, "knowledgeBase")}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{t(locale, "knowledgeSubtitle")}</p>
      </div>
      <div className="card pad">
        {articles.length === 0 ? (
          <p className="muted">{t(locale, "noArticlesYet")}</p>
        ) : (
          <ul>
            {articles.map((a) => (
              <li key={a.id}>{localized(locale, a.title, a.titleFr)} — {a.articleType}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
