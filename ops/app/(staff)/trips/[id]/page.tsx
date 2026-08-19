import { prisma } from "@/lib/db";
import { computeQuoteTotal, formatMinor } from "@/lib/money";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTrip, archiveTrip, restoreTrip } from "../actions";
import { createQuote, duplicateQuote } from "../../quotes/actions";
import { createSupportTicket, resolveSupportTicket } from "../../support/actions";
import { createPayment, markPaymentPaid } from "../../payments/actions";
import { addTraveller, updateTraveller, removeTraveller } from "../../travellers/actions";
import { getLocale, statusLabel, t } from "@/lib/i18n";
import { computeTripStage } from "@/lib/pipeline";
import SubmitButton from "../../SubmitButton";
import ConfirmSubmitButton from "../../ConfirmSubmitButton";
import PipelineStepper from "../../PipelineStepper";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();

  const [trip, assignableStaff] = await Promise.all([
    prisma.trip.findUnique({
      where: { id },
      include: {
        customer: { include: { trips: { select: { id: true, reference: true, overallStatus: true, createdAt: true } } } },
        lead: true,
        requirement: true,
        owner: { select: { id: true, name: true } },
        travellers: { orderBy: { createdAt: "asc" } },
        quotes: { include: { lines: true }, orderBy: { createdAt: "desc" } },
        bookings: { include: { lines: true } },
        documents: true,
        payments: true,
        supportTickets: { orderBy: { openedAt: "desc" } },
      },
    }),
    prisma.staff.findMany({ where: { status: "active" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!trip) notFound();

  const destinations: string[] = trip.requirement?.destinations ? JSON.parse(trip.requirement.destinations) : [];
  const stage = computeTripStage(trip);
  const statusOptions = ["active", "on_hold", "lost", "completed", "cancelled"];
  const requestTypeOptions = ["tailor_made", "omra_hajj", "business_travel", "tour"];
  const genderOptions = ["male", "female"];
  const dateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
  const otherTrips = trip.customer.trips.filter((t2) => t2.id !== trip.id);

  const createQuoteForTrip = async (formData: FormData) => {
    "use server";
    await createQuote(trip.id, String(formData.get("label") ?? ""));
  };

  return (
    <div>
      <div className="card pad fade-in" style={{ marginBottom: 18 }}>
        <PipelineStepper
          locale={locale}
          overallStatus={trip.overallStatus}
          hasRequirement={!!trip.requirement}
          quoteCount={trip.quotes.length}
          quoteAwaitingReply={trip.quotes.some((q) => q.status === "sent")}
          bookingStatus={trip.bookings[0]?.status ?? null}
        />
      </div>

      {/* One form, one action, one submit — status/owner and requirements used to be two adjacent
          forms; typing into one then clicking the OTHER's save button silently discarded the
          first. Merging them means every field on this page saves together, whichever button
          (there's only one now) is clicked. */}
      <form action={updateTrip}>
        <input type="hidden" name="tripId" value={trip.id} />
        <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: "1.6rem" }}>
              <Link href={`/customers/${trip.customer.id}`} style={{ textDecoration: "underline" }}>{trip.customer.name}</Link>
            </h1>
            <p className="muted" style={{ marginTop: 4 }}>
              {trip.reference && <>{trip.reference} · </>}
              {trip.customer.email ?? "—"}{trip.customer.phone ? ` · ${trip.customer.phone}` : ""} · {t(locale, "stageLabel")}: <b>{statusLabel(locale, stage)}</b> · {t(locale, "leadSourcePrefix")}:{" "}
              {trip.lead ? `${trip.lead.channel}${trip.lead.sourceForm ? ` (${trip.lead.sourceForm})` : ""}` : t(locale, "manualEntry")}
              {trip.owner ? ` · ${t(locale, "ownerLabel")}: ${trip.owner.name}` : ""}
            </p>
            {otherTrips.length > 0 && (
              <p style={{ marginTop: 4, fontSize: "0.82rem" }}>
                <Link href={`/customers/${trip.customer.id}`} className="badge int" style={{ textDecoration: "none" }}>
                  {t(locale, "returningCustomerNote", { n: String(otherTrips.length) })}
                </Link>
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label style={{ fontSize: "0.75rem" }}>
              <div className="muted">{t(locale, "requestTypeLabel")}</div>
              <select name="requestType" defaultValue={trip.lead?.requestType ?? ""} disabled={!trip.lead}>
                <option value="">—</option>
                {requestTypeOptions.map((rt) => (
                  <option key={rt} value={rt}>{statusLabel(locale, rt)}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: "0.75rem" }}>
              <div className="muted">{t(locale, "tripStatusPrefix")}</div>
              <select name="overallStatus" defaultValue={trip.overallStatus}>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{statusLabel(locale, s)}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: "0.75rem" }}>
              <div className="muted">{t(locale, "lostReasonLabel")}</div>
              <input type="text" name="lostReason" defaultValue={trip.lostReason ?? ""} style={{ width: 130 }} />
            </label>
            <label style={{ fontSize: "0.75rem" }}>
              <div className="muted">{t(locale, "ownerLabel")}</div>
              <select name="ownerId" defaultValue={trip.ownerId ?? ""}>
                <option value="">{t(locale, "ownerUnassignedOption")}</option>
                {assignableStaff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "saveAllButton")}</SubmitButton>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
          <div className="card pad">
            <h3 style={{ marginBottom: 10, fontSize: "1rem" }}>{t(locale, "requirementsHeading")}</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "colDestinations")}</div>
                <input type="text" name="destinations" defaultValue={destinations.join(", ")} style={{ width: 160 }} />
              </label>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "travelersLabel")}</div>
                <input type="number" name="travelerCount" defaultValue={trip.requirement?.travelerCount ?? ""} style={{ width: 60 }} />
              </label>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "lengthDaysLabel")}</div>
                <input type="number" name="tripLengthDays" defaultValue={trip.requirement?.tripLengthDays ?? ""} style={{ width: 70 }} />
              </label>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "travelStartDateLabel")}</div>
                <input type="date" name="travelStartDate" defaultValue={trip.requirement?.travelStartDate?.toISOString().slice(0, 10) ?? ""} />
              </label>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "accommodationLabel")}</div>
                <input type="text" name="accommodationCategory" defaultValue={trip.requirement?.accommodationCategory ?? ""} style={{ width: 120 }} />
              </label>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "budgetBandLabel")}</div>
                <input type="text" name="budgetBand" defaultValue={trip.requirement?.budgetBand ?? ""} style={{ width: 110 }} />
              </label>
              <label style={{ fontSize: "0.78rem", flex: "1 1 160px" }}>
                <div className="muted">{t(locale, "notesLabel")}</div>
                <input type="text" name="notes" defaultValue={trip.requirement?.notes ?? ""} style={{ width: "100%" }} />
              </label>
            </div>
          </div>

          <div className="card pad">
            <h3 style={{ marginBottom: 10, fontSize: "1rem" }}>{t(locale, "pipelineStatusHeading")}</h3>
            <div style={{ fontSize: "0.85rem", lineHeight: 1.9 }}>
              <div>{t(locale, "colLead")}: <b>{trip.lead ? statusLabel(locale, trip.lead.qualificationStatus) : `n/a (${t(locale, "manualEntry")})`}</b></div>
              <div>
                {t(locale, "requestTypeLabel")}:{" "}
                <b>{trip.lead?.requestType ? statusLabel(locale, trip.lead.requestType) : t(locale, "requestTypeUnclassified")}</b>
              </div>
              <div>{t(locale, "requirementsHeading")}: <b>{trip.requirement ? t(locale, "requirementsCaptured") : t(locale, "requirementsNotCaptured")}</b></div>
              <div>{t(locale, "travellersHeading")}: <b>{trip.travellers.length || t(locale, "noneLabel")}</b></div>
              <div>{t(locale, "colQuotes")}: <b>{trip.quotes.length}</b></div>
              <div>{t(locale, "bookingHeading")}: <b>{trip.bookings.length ? statusLabel(locale, trip.bookings[0].status) : t(locale, "notBooked")}</b></div>
              <div>{t(locale, "documents")}: <b>{trip.documents.length || t(locale, "noneLabel")}</b></div>
              <div>{t(locale, "payments")}: <b>{trip.payments.length || t(locale, "noneLabel")}</b></div>
              <div>{t(locale, "supportHeading")}: <b>{trip.supportTickets.filter((s) => s.status !== "resolved" && s.status !== "closed").length} {t(locale, "openWord")}</b></div>
            </div>
          </div>
        </div>

        {/* A second, identical submit button here on purpose (Operational Inspection §2.4) — the
            first one sits above the Requirements fields, so editing a field down here used to
            mean scrolling back up to find "Save changes" with no autosave in between. */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
          <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "saveAllButton")}</SubmitButton>
        </div>
      </form>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3 style={{ marginBottom: 4 }}>{t(locale, "travellersHeading")} <span className="muted" style={{ fontSize: "0.78rem", fontWeight: 400 }}>({trip.travellers.length})</span></h3>
          <p className="muted" style={{ fontSize: "0.78rem" }}>{t(locale, "travellersHint")}</p>
        </div>
        <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <details>
            <summary style={{ cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "var(--color-int)" }}>{t(locale, "addTravellerButton")}</summary>
            <form action={addTraveller} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
              <input type="hidden" name="tripId" value={trip.id} />
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "firstNameLabel")}</div>
                <input type="text" name="firstName" required autoFocus />
              </label>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "lastNameLabel")}</div>
                <input type="text" name="lastName" required />
              </label>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "dateOfBirthLabel")}</div>
                <input type="date" name="dateOfBirth" />
              </label>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "genderLabel")}</div>
                <select name="gender" defaultValue="">
                  <option value="">—</option>
                  {genderOptions.map((g) => <option key={g} value={g}>{statusLabel(locale, g)}</option>)}
                </select>
              </label>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "nationalityLabel")}</div>
                <input type="text" name="nationality" style={{ width: 110 }} />
              </label>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "passportNumberLabel")}</div>
                <input type="text" name="passportNumber" style={{ width: 130 }} />
              </label>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "passportExpiryLabel")}</div>
                <input type="date" name="passportExpiry" />
              </label>
              <label style={{ fontSize: "0.78rem" }}>
                <div className="muted">{t(locale, "mahramRelationshipLabel")}</div>
                <input type="text" name="mahramRelationship" placeholder={t(locale, "mahramRelationshipPlaceholder")} style={{ width: 150 }} />
              </label>
              <label style={{ fontSize: "0.78rem", flex: "1 1 200px" }}>
                <div className="muted">{t(locale, "notesLabel")}</div>
                <input type="text" name="notes" style={{ width: "100%" }} />
              </label>
              <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "addTravellerButton")}</SubmitButton>
            </form>
          </details>
        </div>
        {trip.travellers.length === 0 ? (
          <div className="pad muted">{t(locale, "noTravellersYet")}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t(locale, "colName")}</th>
                <th>{t(locale, "dateOfBirthLabel")}</th>
                <th>{t(locale, "passportNumberLabel")}</th>
                <th>{t(locale, "passportExpiryLabel")}</th>
                <th>{t(locale, "mahramRelationshipLabel")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trip.travellers.map((tv) => (
                <tr key={tv.id}>
                  <td style={{ fontWeight: 600 }}>
                    {tv.firstName} {tv.lastName}
                    {tv.gender && <div className="muted" style={{ fontWeight: 400, fontSize: "0.74rem" }}>{statusLabel(locale, tv.gender)}{tv.nationality ? ` · ${tv.nationality}` : ""}</div>}
                  </td>
                  <td className="muted">{tv.dateOfBirth ? tv.dateOfBirth.toLocaleDateString() : "—"}</td>
                  <td className="muted">{tv.passportNumber ?? "—"}</td>
                  <td className="muted">{tv.passportExpiry ? tv.passportExpiry.toLocaleDateString() : "—"}</td>
                  <td className="muted">{tv.mahramRelationship ?? "—"}</td>
                  <td>
                    <details>
                      <summary className="btn" style={{ display: "inline-block", cursor: "pointer" }}>{t(locale, "editButton")}</summary>
                      <form action={updateTraveller} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
                        <input type="hidden" name="id" value={tv.id} />
                        <input type="hidden" name="tripId" value={trip.id} />
                        <label style={{ fontSize: "0.76rem" }}>
                          <div className="muted">{t(locale, "firstNameLabel")}</div>
                          <input type="text" name="firstName" defaultValue={tv.firstName} required style={{ width: 100 }} />
                        </label>
                        <label style={{ fontSize: "0.76rem" }}>
                          <div className="muted">{t(locale, "lastNameLabel")}</div>
                          <input type="text" name="lastName" defaultValue={tv.lastName} required style={{ width: 100 }} />
                        </label>
                        <label style={{ fontSize: "0.76rem" }}>
                          <div className="muted">{t(locale, "dateOfBirthLabel")}</div>
                          <input type="date" name="dateOfBirth" defaultValue={dateInput(tv.dateOfBirth)} />
                        </label>
                        <label style={{ fontSize: "0.76rem" }}>
                          <div className="muted">{t(locale, "genderLabel")}</div>
                          <select name="gender" defaultValue={tv.gender ?? ""}>
                            <option value="">—</option>
                            {genderOptions.map((g) => <option key={g} value={g}>{statusLabel(locale, g)}</option>)}
                          </select>
                        </label>
                        <label style={{ fontSize: "0.76rem" }}>
                          <div className="muted">{t(locale, "nationalityLabel")}</div>
                          <input type="text" name="nationality" defaultValue={tv.nationality ?? ""} style={{ width: 100 }} />
                        </label>
                        <label style={{ fontSize: "0.76rem" }}>
                          <div className="muted">{t(locale, "passportNumberLabel")}</div>
                          <input type="text" name="passportNumber" defaultValue={tv.passportNumber ?? ""} style={{ width: 120 }} />
                        </label>
                        <label style={{ fontSize: "0.76rem" }}>
                          <div className="muted">{t(locale, "passportExpiryLabel")}</div>
                          <input type="date" name="passportExpiry" defaultValue={dateInput(tv.passportExpiry)} />
                        </label>
                        <label style={{ fontSize: "0.76rem" }}>
                          <div className="muted">{t(locale, "mahramRelationshipLabel")}</div>
                          <input type="text" name="mahramRelationship" defaultValue={tv.mahramRelationship ?? ""} style={{ width: 130 }} />
                        </label>
                        <label style={{ fontSize: "0.76rem", flex: "1 1 160px" }}>
                          <div className="muted">{t(locale, "notesLabel")}</div>
                          <input type="text" name="notes" defaultValue={tv.notes ?? ""} style={{ width: "100%" }} />
                        </label>
                        <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "updateButton")}</SubmitButton>
                      </form>
                      <form action={removeTraveller} style={{ marginTop: 8 }}>
                        <input type="hidden" name="id" value={tv.id} />
                        <input type="hidden" name="tripId" value={trip.id} />
                        <ConfirmSubmitButton className="btn btn-danger" confirmMessage={t(locale, "removeTravellerConfirm")}>{t(locale, "removeButton")}</ConfirmSubmitButton>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="pad" style={{ borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>{t(locale, "colQuotes")} <span className="muted" style={{ fontSize: "0.78rem", fontWeight: 400 }}>{t(locale, "quotesHint")}</span></h3>
          <form action={createQuoteForTrip} style={{ display: "flex", gap: 8 }}>
            <input type="text" name="label" placeholder={t(locale, "quoteLabelPlaceholder")} style={{ width: 160 }} />
            <SubmitButton pendingLabel={t(locale, "savingButton")}>{t(locale, "newQuoteButton")}</SubmitButton>
          </form>
        </div>
        {trip.quotes.length === 0 ? (
          <div className="pad muted">{t(locale, "noQuotesForTrip")}</div>
        ) : (
          <table>
            <thead><tr><th>{t(locale, "colLabel")}</th><th>{t(locale, "colStatus")}</th><th>{t(locale, "colLines")}</th><th>{t(locale, "colTotal")}</th><th></th></tr></thead>
            <tbody>
              {trip.quotes.map((q) => {
                const total = computeQuoteTotal(q.lines, q.currency);
                return (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 600 }}>{q.label ?? <span className="muted">{t(locale, "unlabeled")}</span>}<span className="muted" style={{ fontWeight: 400 }}> v{q.version}</span></td>
                    <td className="muted">{statusLabel(locale, q.status)}</td>
                    <td className="muted">{q.lines.length}</td>
                    <td>{total != null ? formatMinor(total, q.currency) : <span style={{ color: "var(--color-ext)" }}>⚠ {t(locale, "mixedCurrencyShort")}</span>}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <Link href={`/quotes/${q.id}`} className="btn">{t(locale, "openButton")}</Link>
                      <form action={duplicateQuote}>
                        <input type="hidden" name="quoteId" value={q.id} />
                        <button className="btn" type="submit" title={t(locale, "duplicateQuoteButton")}>{t(locale, "duplicateQuoteButton")}</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div className="card pad">
          <h4 style={{ marginBottom: 8, fontSize: "0.9rem" }}>{t(locale, "bookingHeading")}</h4>
          {trip.bookings.length ? (
            trip.bookings.map((b) => (
              <p key={b.id} className="muted" style={{ fontSize: "0.82rem" }}>
                {statusLabel(locale, b.status)} · {b.lines.length} {t(locale, "productsWord")}
              </p>
            ))
          ) : (
            <p className="muted" style={{ fontSize: "0.82rem" }}>{t(locale, "bookingNotBuilt")}</p>
          )}
        </div>
        <div className="card pad">
          <h4 style={{ marginBottom: 8, fontSize: "0.9rem" }}>{t(locale, "documents")}</h4>
          <p className="muted" style={{ fontSize: "0.82rem" }}>
            {trip.documents.length ? `${trip.documents.length}` : t(locale, "documentsNotBuilt")}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3>{t(locale, "payments")}</h3>
        </div>
        <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <form action={createPayment} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <input type="hidden" name="tripId" value={trip.id} />
            <label style={{ fontSize: "0.78rem" }}>
              <div className="muted">{t(locale, "directionLabel")}</div>
              <select name="direction" defaultValue="inbound">
                <option value="inbound">{statusLabel(locale, "inbound")}</option>
                <option value="outbound">{statusLabel(locale, "outbound")}</option>
              </select>
            </label>
            <label style={{ fontSize: "0.78rem" }}>
              <div className="muted">{t(locale, "paymentTypeLabel")}</div>
              <select name="type" defaultValue="deposit">
                {["deposit", "balance", "refund", "payout"].map((tp) => (
                  <option key={tp} value={tp}>{statusLabel(locale, tp)}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: "0.78rem" }}>
              <div className="muted">{t(locale, "amountLabel")}</div>
              <input type="number" name="amount" step="0.01" min="0" style={{ width: 100 }} required />
            </label>
            <input type="hidden" name="currency" value="MAD" />
            <label style={{ fontSize: "0.78rem" }}>
              <div className="muted">{t(locale, "dueDateLabel")}</div>
              <input type="date" name="dueDate" />
            </label>
            <label style={{ fontSize: "0.78rem" }}>
              <div className="muted">{t(locale, "paidDateLabel")}</div>
              <input type="date" name="paidDate" />
            </label>
            <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "recordPaymentButton")}</SubmitButton>
          </form>
        </div>
        {trip.payments.length === 0 ? (
          <div className="pad muted">{t(locale, "noPaymentsForTrip")}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t(locale, "colDirection")}</th>
                <th>{t(locale, "paymentTypeLabel")}</th>
                <th>{t(locale, "colAmount")}</th>
                <th>{t(locale, "colDueDate")}</th>
                <th>{t(locale, "colStatus")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trip.payments.map((p) => {
                const overdue = p.direction === "inbound" && !p.paidDate && p.dueDate != null && p.dueDate.getTime() < Date.now();
                return (
                  <tr key={p.id}>
                    <td className="muted">{statusLabel(locale, p.direction)}</td>
                    <td className="muted">{statusLabel(locale, p.type)}</td>
                    <td>{formatMinor(p.amountMinor, p.currency)}</td>
                    <td className="muted">{p.dueDate ? p.dueDate.toLocaleDateString() : "—"}</td>
                    <td>
                      {p.paidDate ? (
                        <span className="badge success">{t(locale, "paymentPaidLabel")}</span>
                      ) : overdue ? (
                        <span className="badge danger">{t(locale, "paymentOverdueLabel")}</span>
                      ) : (
                        <span className="badge warn">{t(locale, "paymentDueLabel")}</span>
                      )}
                    </td>
                    <td>
                      {!p.paidDate && (
                        <form action={markPaymentPaid}>
                          <input type="hidden" name="paymentId" value={p.id} />
                          <input type="hidden" name="tripId" value={trip.id} />
                          <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "markPaidButton")}</SubmitButton>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3>{t(locale, "supportHeading")}</h3>
        </div>
        <div className="pad" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <form action={createSupportTicket} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <input type="hidden" name="tripId" value={trip.id} />
            <label style={{ fontSize: "0.8rem", flex: 1 }}>
              <div className="muted">{t(locale, "newTicketSubjectLabel")}</div>
              <input type="text" name="subject" style={{ width: "100%" }} required />
            </label>
            <label style={{ fontSize: "0.8rem" }}>
              <div className="muted">{t(locale, "ticketPriorityLabel")}</div>
              <select name="priority" defaultValue="normal">
                <option value="low">{locale === "fr" ? "Basse" : "Low"}</option>
                <option value="normal">{locale === "fr" ? "Normale" : "Normal"}</option>
                <option value="high">{locale === "fr" ? "Haute" : "High"}</option>
                <option value="urgent">{locale === "fr" ? "Urgente" : "Urgent"}</option>
              </select>
            </label>
            <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "newTicketButton")}</SubmitButton>
          </form>
        </div>
        {trip.supportTickets.length === 0 ? (
          <div className="pad muted">{t(locale, "noTicketsForTrip")}</div>
        ) : (
          <table>
            <thead><tr><th>{t(locale, "colSubject")}</th><th>{t(locale, "colPriority")}</th><th>{t(locale, "colStatus")}</th><th>{t(locale, "colOpened")}</th><th></th></tr></thead>
            <tbody>
              {trip.supportTickets.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>
                    {s.subject}
                    {s.resolutionNote && <div className="muted" style={{ fontWeight: 400, fontSize: "0.75rem" }}>{s.resolutionNote}</div>}
                  </td>
                  <td className="muted">{statusLabel(locale, s.priority)}</td>
                  <td className="muted">{statusLabel(locale, s.status)}</td>
                  <td className="muted">{s.openedAt.toLocaleDateString()}</td>
                  <td>
                    {s.status !== "resolved" && (
                      <form action={resolveSupportTicket} style={{ display: "flex", gap: 6 }}>
                        <input type="hidden" name="ticketId" value={s.id} />
                        <input type="hidden" name="tripId" value={trip.id} />
                        <input type="text" name="resolutionNote" placeholder={t(locale, "resolutionNoteLabel")} style={{ width: 140 }} />
                        <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "markResolvedButton")}</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Deliberately isolated from every other action on this page — small, muted, at the very
          bottom, with its own explicit warning. The one action here that cannot be undone should
          never sit next to the routine "Save changes" button. */}
      <div className="card pad" style={{ marginTop: 24, borderColor: "var(--color-danger)" }}>
        <h4 style={{ fontSize: "0.85rem", marginBottom: 6, color: "var(--color-danger)" }}>{t(locale, "dangerZoneHeading")}</h4>
        {trip.archivedAt ? (
          <>
            <p className="muted" style={{ fontSize: "0.78rem", marginBottom: 10 }}>{t(locale, "tripArchivedNote")}</p>
            <form action={restoreTrip}>
              <input type="hidden" name="tripId" value={trip.id} />
              <SubmitButton className="btn" pendingLabel={t(locale, "savingButton")}>{t(locale, "restoreTripButton")}</SubmitButton>
            </form>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: "0.78rem", marginBottom: 10 }}>{t(locale, "archiveTripWarning")}</p>
            <form action={archiveTrip}>
              <input type="hidden" name="tripId" value={trip.id} />
              <ConfirmSubmitButton className="btn btn-danger" confirmMessage={t(locale, "archiveTripConfirm")}>
                {t(locale, "archiveTripButton")}
              </ConfirmSubmitButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
