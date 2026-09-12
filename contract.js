export const STAGES = ["Seed", "Root", "Sprout", "Stem", "Branch", "Flower", "Fruit"];

export function validateResponse(obj) {
    if (obj === null || typeof obj !== "object") {
        return { ok: false, value: null, error: "Response is not an object." };
    }

    if (typeof obj.stage !== "string" || !STAGES.includes(obj.stage)) {
        return { ok: false, value: null, error: `stage must be one of: ${STAGES.join(", ")}.` };
    }

    if (typeof obj.principle !== "string" || !obj.principle.trim()) {
        return { ok: false, value: null, error: "principle must be a non-empty string." };
    }

    if (typeof obj.action !== "string" || !obj.action.trim()) {
        return { ok: false, value: null, error: "action must be a non-empty string." };
    }

    if (typeof obj.minutes !== "number" || !Number.isFinite(obj.minutes)) {
        return { ok: false, value: null, error: "minutes must be a number." };
    }

    return {
        ok: true,
        value: {
            stage: obj.stage,
            principle: obj.principle,
            action: obj.action,
            minutes: obj.minutes,
        },
        error: null,
    };
}
