const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type CfbdPlayerResponse = {
  id?: string | number;
  name?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  team?: string;
  school?: string;
  year?: number;
};

type RequestBody = {
  searchTerm?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  const apiKey = Deno.env.get("CFBD_API_KEY");
  const baseUrl =
    Deno.env.get("CFBD_BASE_URL") ?? "https://apinext.collegefootballdata.com";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "CFBD API key is not configured." }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  const searchTerm = body.searchTerm?.trim();
  if (!searchTerm) {
    return new Response(JSON.stringify({ players: [] }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  const url = new URL("/player/search", baseUrl);
  url.searchParams.set("searchTerm", searchTerm);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    return new Response(
      JSON.stringify({
        error: "CFBD request failed.",
        status: response.status,
        details: errorText,
      }),
      {
        status: 502,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  const players = (await response.json()) as CfbdPlayerResponse[];

  return new Response(JSON.stringify({ players }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
