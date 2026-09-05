/**
 * Ethiopian Calendar & Holiday Suggestion Utilities
 *
 * Suggests public, cultural, and religious holidays for Ethiopian schools during
 * a given academic year range (Gregorian startDate to endDate).
 *
 * Note: These are suggestions with source "IMPORTED" / "SYSTEM".
 * Institutional administrators have the final authority to confirm, customize closure dates, or dismiss.
 */

export interface SuggestedHoliday {
    title: string;
    type: "PUBLIC_HOLIDAY" | "SCHOOL_HOLIDAY" | "MIDYEAR_BREAK" | "TERM_BREAK";
    category: "HOLIDAY_BREAK";
    suggestedStartDate: string; // ISO string (YYYY-MM-DD)
    suggestedEndDate: string;   // ISO string (YYYY-MM-DD)
    isSchoolClosedDefault: boolean;
    description: string;
    religiousOrNationalContext: string;
}

/**
 * Calculates Orthodox Easter (Fasika) in Gregorian calendar for a given year.
 */
function getOrthodoxEasterSunday(year: number): Date {
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;

    // Julian date: month (3 = March, 4 = April)
    const julianDate = new Date(Date.UTC(year, month - 1, day));
    // Difference between Gregorian and Julian calendar for 1900-2099 is 13 days
    julianDate.setUTCDate(julianDate.getUTCDate() + 13);
    return julianDate;
}

/**
 * Approximates Islamic lunar holidays for a given Gregorian year.
 * Since Hijri calendar shifts ~10-11 days earlier each solar year,
 * we anchor on known reference dates with accurate astronomical approximations.
 */
function getIslamicHolidays(year: number): { mawlid?: Date; eidAlFitr: Date; eidAlAdha: Date } {
    // Reference points:
    // 2025: Eid al-Fitr ~ March 31, Eid al-Adha ~ June 6, Mawlid ~ Sep 5
    // 2026: Eid al-Fitr ~ March 20, Eid al-Adha ~ May 27, Mawlid ~ Aug 25
    // 2027: Eid al-Fitr ~ March 10, Eid al-Adha ~ May 16, Mawlid ~ Aug 14
    // 2028: Eid al-Fitr ~ February 27, Eid al-Adha ~ May 5, Mawlid ~ Aug 3
    const lunarYearDiff = year - 2025;
    const shiftDays = Math.round(lunarYearDiff * 10.875);

    const fitrBase = new Date(Date.UTC(2025, 2, 31)); // March 31, 2025
    fitrBase.setUTCDate(fitrBase.getUTCDate() - shiftDays);

    const adhaBase = new Date(Date.UTC(2025, 5, 6)); // June 6, 2025
    adhaBase.setUTCDate(adhaBase.getUTCDate() - shiftDays);

    const mawlidBase = new Date(Date.UTC(2025, 8, 5)); // Sep 5, 2025
    mawlidBase.setUTCDate(mawlidBase.getUTCDate() - shiftDays);

    return {
        eidAlFitr: fitrBase,
        eidAlAdha: adhaBase,
        mawlid: mawlidBase
    };
}

function formatDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/**
 * Generate suggested Ethiopian holidays falling within the academic year window.
 */
export function getSuggestedEthiopianHolidays(academicYearStart: Date, academicYearEnd: Date): SuggestedHoliday[] {
    const startYear = academicYearStart.getFullYear();
    const endYear = academicYearEnd.getFullYear();
    const suggestions: SuggestedHoliday[] = [];

    // Evaluate years spanned by the academic calendar
    for (let y = startYear; y <= endYear; y++) {
        // 1. Enkutatash (Ethiopian New Year) - Meskerem 1
        // September 11 (or Sep 12 if leap year or year after leap)
        const isLeapLead = (y % 4 === 3);
        const enkutatashDay = isLeapLead ? 12 : 11;
        const enkutatashDate = new Date(Date.UTC(y, 8, enkutatashDay)); // Month 8 is September
        suggestions.push({
            title: "Enkutatash (Ethiopian New Year)",
            type: "PUBLIC_HOLIDAY",
            category: "HOLIDAY_BREAK",
            suggestedStartDate: formatDateStr(enkutatashDate),
            suggestedEndDate: formatDateStr(enkutatashDate),
            isSchoolClosedDefault: true,
            description: "First day of the Ethiopian calendar (Meskerem 1). Official national public holiday.",
            religiousOrNationalContext: "National / Cultural"
        });

        // 2. Meskel (Finding of the True Cross) - Meskerem 17
        const meskelDay = isLeapLead ? 28 : 27;
        const meskelDate = new Date(Date.UTC(y, 8, meskelDay));
        suggestions.push({
            title: "Meskel (Finding of the True Cross)",
            type: "PUBLIC_HOLIDAY",
            category: "HOLIDAY_BREAK",
            suggestedStartDate: formatDateStr(meskelDate),
            suggestedEndDate: formatDateStr(meskelDate),
            isSchoolClosedDefault: true,
            description: "Commemoration of the Discovery of the True Cross (Meskerem 17). Official public holiday.",
            religiousOrNationalContext: "Ethiopian Orthodox"
        });

        // 3. Genna (Ethiopian Christmas) - Tahsas 29
        const gennaDate = new Date(Date.UTC(y, 0, 7)); // Jan 7
        suggestions.push({
            title: "Genna (Ethiopian Christmas)",
            type: "PUBLIC_HOLIDAY",
            category: "HOLIDAY_BREAK",
            suggestedStartDate: formatDateStr(gennaDate),
            suggestedEndDate: formatDateStr(gennaDate),
            isSchoolClosedDefault: true,
            description: "Celebration of the Nativity according to the Ethiopian calendar (Tahsas 29).",
            religiousOrNationalContext: "Ethiopian Orthodox"
        });

        // 4. Timket (Ethiopian Epiphany) - Tir 11
        const timketDate = new Date(Date.UTC(y, 0, 19)); // Jan 19
        suggestions.push({
            title: "Timket (Ethiopian Epiphany)",
            type: "PUBLIC_HOLIDAY",
            category: "HOLIDAY_BREAK",
            suggestedStartDate: formatDateStr(timketDate),
            suggestedEndDate: formatDateStr(timketDate),
            isSchoolClosedDefault: true,
            description: "Commemoration of the Baptism of Jesus in the Jordan River (Tir 11).",
            religiousOrNationalContext: "Ethiopian Orthodox"
        });

        // 5. Adwa Victory Day - Yekatit 23
        const adwaDate = new Date(Date.UTC(y, 2, 2)); // March 2
        suggestions.push({
            title: "Victory of Adwa Day",
            type: "PUBLIC_HOLIDAY",
            category: "HOLIDAY_BREAK",
            suggestedStartDate: formatDateStr(adwaDate),
            suggestedEndDate: formatDateStr(adwaDate),
            isSchoolClosedDefault: true,
            description: "Commemoration of Ethiopia's historic victory at the Battle of Adwa (1896).",
            religiousOrNationalContext: "National Patriotic"
        });

        // 6. Good Friday (Siklet) & Fasika (Easter)
        const easter = getOrthodoxEasterSunday(y);
        const siklet = new Date(easter);
        siklet.setUTCDate(easter.getUTCDate() - 2);

        suggestions.push({
            title: "Siklet (Ethiopian Good Friday)",
            type: "PUBLIC_HOLIDAY",
            category: "HOLIDAY_BREAK",
            suggestedStartDate: formatDateStr(siklet),
            suggestedEndDate: formatDateStr(siklet),
            isSchoolClosedDefault: true,
            description: "Crucifixion of Christ observed before Ethiopian Easter.",
            religiousOrNationalContext: "Ethiopian Orthodox"
        });

        suggestions.push({
            title: "Fasika (Ethiopian Easter)",
            type: "PUBLIC_HOLIDAY",
            category: "HOLIDAY_BREAK",
            suggestedStartDate: formatDateStr(easter),
            suggestedEndDate: formatDateStr(easter),
            isSchoolClosedDefault: true,
            description: "Resurrection Sunday according to the Ethiopian Orthodox calendar.",
            religiousOrNationalContext: "Ethiopian Orthodox"
        });

        // 7. Patriots' Victory Day - Miazia 27
        const patriotsDate = new Date(Date.UTC(y, 4, 5)); // May 5
        suggestions.push({
            title: "Patriots' Victory Day",
            type: "PUBLIC_HOLIDAY",
            category: "HOLIDAY_BREAK",
            suggestedStartDate: formatDateStr(patriotsDate),
            suggestedEndDate: formatDateStr(patriotsDate),
            isSchoolClosedDefault: true,
            description: "Commemorating the end of the Italian occupation in 1941 (Miazia 27).",
            religiousOrNationalContext: "National Patriotic"
        });

        // 8. Derg Downfall Day (Ginbot 20)
        const ginbotDate = new Date(Date.UTC(y, 4, 28)); // May 28
        suggestions.push({
            title: "Derg Downfall Day (Ginbot 20)",
            type: "PUBLIC_HOLIDAY",
            category: "HOLIDAY_BREAK",
            suggestedStartDate: formatDateStr(ginbotDate),
            suggestedEndDate: formatDateStr(ginbotDate),
            isSchoolClosedDefault: true,
            description: "Commemoration of the downfall of the Derg regime (1991).",
            religiousOrNationalContext: "National Public Holiday"
        });

        // 9. Islamic Holidays
        const islamic = getIslamicHolidays(y);
        if (islamic.mawlid) {
            suggestions.push({
                title: "Mawlid (Birth of the Prophet Muhammad)",
                type: "PUBLIC_HOLIDAY",
                category: "HOLIDAY_BREAK",
                suggestedStartDate: formatDateStr(islamic.mawlid),
                suggestedEndDate: formatDateStr(islamic.mawlid),
                isSchoolClosedDefault: true,
                description: "Birthday of Prophet Muhammad (12 Rabi' al-Awwal). Lunar date may adjust by 1 day.",
                religiousOrNationalContext: "Islamic"
            });
        }

        suggestions.push({
            title: "Eid al-Fitr (End of Ramadan)",
            type: "PUBLIC_HOLIDAY",
            category: "HOLIDAY_BREAK",
            suggestedStartDate: formatDateStr(islamic.eidAlFitr),
            suggestedEndDate: formatDateStr(islamic.eidAlFitr),
            isSchoolClosedDefault: true,
            description: "Festival marking the end of Ramadan. Subject to official moon sighting and directives.",
            religiousOrNationalContext: "Islamic"
        });

        suggestions.push({
            title: "Eid al-Adha (Arefa)",
            type: "PUBLIC_HOLIDAY",
            category: "HOLIDAY_BREAK",
            suggestedStartDate: formatDateStr(islamic.eidAlAdha),
            suggestedEndDate: formatDateStr(islamic.eidAlAdha),
            isSchoolClosedDefault: true,
            description: "Feast of the Sacrifice (10 Dhu al-Hijjah). Subject to official moon sighting directives.",
            religiousOrNationalContext: "Islamic"
        });
    }

    // Filter strictly within the academic year window
    const startTime = academicYearStart.getTime();
    const endTime = academicYearEnd.getTime();

    const filtered = suggestions.filter(item => {
        const itemTime = new Date(item.suggestedStartDate + "T00:00:00.000Z").getTime();
        return itemTime >= startTime && itemTime <= endTime;
    });

    // Deduplicate by title & date
    const seen = new Set<string>();
    const unique: SuggestedHoliday[] = [];
    for (const h of filtered) {
        const key = `${h.title}-${h.suggestedStartDate}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(h);
        }
    }

    // Sort chronologically
    return unique.sort((a, b) => a.suggestedStartDate.localeCompare(b.suggestedStartDate));
}
