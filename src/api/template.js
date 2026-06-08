import { apiFetch, mockDelay } from "./client";

const USE_MOCK = true;

/**
 * Fetch templates.
 *
 * REAL ENDPOINT:  GET /templates
 * RESPONSE:       Templates
 *
 * @returns {Promise<object>}
 */
export async function getTemplates(params) {
  if (USE_MOCK) {
    await mockDelay(200);
    return {
      data: [
        {
          id: "2422324241527654",
          name: "reengagement_promo",
          status: "APPROVED",
          language: "en",
          category: "MARKETING",
          sub_category: "CUSTOM",
          components: [
            {
              type: "BODY",
              text: "Hi {{name}}, we miss you!\n\nIt's been a while since your last visit.\nHere's a personal offer just for you: \n{{promo_value}}.\n\nUse code {{promo_code}} — valid for {{expiry_days}} days.\n\nSee you soon!\n\n_To unsubscribe from promotional messages, reply *STOP* at any time_",
              example: {
                body_text_named_params: [
                  {
                    param_name: "name",
                    example: "Samuel",
                  },
                  {
                    param_name: "promo_value",
                    example: "20% off your next order",
                  },
                  {
                    param_name: "promo_code",
                    example: "BACK20",
                  },
                  {
                    param_name: "expiry_days",
                    example: "30",
                  },
                ],
              },
            },
          ],
          quality_score: {
            score: "UNKNOWN",
            date: 1779171687,
          },
          rejected_reason: "NONE",
        },
        {
          id: "1720417235612044",
          name: "hello_world",
          status: "APPROVED",
          language: "en_US",
          category: "UTILITY",
          components: [
            {
              type: "HEADER",
              format: "TEXT",
              text: "Hello World",
            },
            {
              type: "BODY",
              text: "Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.",
            },
            {
              type: "FOOTER",
              text: "WhatsApp Business Platform sample message",
            },
          ],
          quality_score: {
            score: "UNKNOWN",
            date: 1778993530,
          },
          rejected_reason: "NONE",
        },
      ],
      paging: {
        cursors: {
          before:
            "QVFIU2tOUHZA2emg2UXk5TUhfX1hqQk9OY3JiRWI1ZAElUYUxjMlJzTHhnSHlUc2N2alpFSkRCZAks2dDFoQkJFMUMxR0t2ckhDMDRjbGhOWFROS0hJbkdoektR",
          after:
            "QVFIU1kwTXU2dm03M1hiSzl3MGJpeHRsclF3Wk1VOTdjQjB0aTBsdzgtSGtIUW5VZAVZAzcVdMN3lya3g0WTVXbC0tT0N3RHloNTI1NTBnOU5ES0VtZAFhOTFZAR",
        },
      },
    };
  }
  return apiFetch("/templates", { params });
}
