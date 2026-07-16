import type { OutreachProvider } from "./outreach.provider";
import type { OutreachGenerationInput, OutreachDraftResult } from "./outreach.provider";
import type { ProviderResult } from "../provider-types";
import { buildMeta } from "../provider-types";

export class MockOutreachProvider implements OutreachProvider {
  readonly id = "mock";
  readonly version = "0.1.0";

  async generateOutreachDraft(
    input: OutreachGenerationInput,
  ): Promise<ProviderResult<OutreachDraftResult>> {
    const { channel, messageType, language, tone, length, objective } = input.outreachRequest;
    const { companyName, industry, qualificationReasons } = input.companyContext;
    const { roleTitle, buyingRole, likelyPainPoints, recommendedMessageAngles } =
      input.decisionRoleContext;
    const { productName } = input.productContext;
    const countryName = input.marketContext?.countryName ?? input.productContext.productName;

    const isEnglish = language === "en";

    const painPoint = likelyPainPoints[0] ?? "efficiency and growth";
    const angle = recommendedMessageAngles[0] ?? "value-driven approach";
    const qualifier = qualificationReasons[0] ?? "strong product-market alignment";

    const subject = this.buildSubject(
      channel,
      messageType,
      isEnglish,
      roleTitle,
      companyName,
      productName,
    );

    const body = this.buildBody(
      channel,
      messageType,
      language,
      tone,
      length,
      companyName,
      industry ?? "technology",
      roleTitle,
      buyingRole,
      painPoint,
      angle,
      productName,
      countryName,
      objective,
      qualifier,
    );

    const callToAction = this.buildCallToAction(channel, messageType, isEnglish);

    const evidenceUsed = [
      isEnglish
        ? `Company industry: ${industry ?? "technology"}`
        : `Sirket sektoru: ${industry ?? "teknoloji"}`,
      isEnglish ? `Role: ${roleTitle}` : `Rol: ${roleTitle}`,
      isEnglish ? `Pain point: ${painPoint}` : `Sorun: ${painPoint}`,
      isEnglish ? `Qualification: ${qualifier}` : `Nitelik: ${qualifier}`,
    ];

    const assumptions = [
      isEnglish
        ? "Timing and budget availability are assumed favorable."
        : "Zamanlama ve butce uygun varsayilmistir.",
      isEnglish
        ? "The role has decision-making influence."
        : "Rolun karar verme yetkisine sahip oldugu varsayilmistir.",
    ];

    const warnings: string[] = [];
    if (qualificationReasons.length < 2) {
      warnings.push(
        isEnglish
          ? "Limited qualification signals — outreach is based on fewer data points."
          : "Sinirli nitelik sinyali - mesaj daha az veri noktasina dayanmaktadir.",
      );
    }
    if ((input.companyContext.employeeCountMax ?? 0) < 50) {
      warnings.push(
        isEnglish
          ? "Small company size — messaging tailored for smaller organizations."
          : "Kucuk sirket olcegi - mesaj daha kucuk organizasyonlar icin uyarlanmistir.",
      );
    }

    const startedAt = Date.now();

    return {
      data: {
        schemaVersion: "1.0.0",
        draft: {
          channel,
          messageType,
          language,
          subject,
          body,
          callToAction,
          tone,
          length,
        },
        personalizationSummary: {
          companyContextUsed: isEnglish
            ? `${companyName} in ${industry ?? "technology"}`
            : `${companyName}, ${industry ?? "teknoloji"}`,
          roleContextUsed: isEnglish
            ? `${roleTitle} (${buyingRole})`
            : `${roleTitle} (${buyingRole})`,
          painPointUsed: painPoint,
          outreachAngleUsed: angle,
          countryOrMarketContextUsed: countryName,
        },
        evidenceUsed,
        assumptions,
        warnings,
        missingInformation: [
          isEnglish
            ? "Exact budget and timeline are unknown."
            : "Tam butce ve zaman cizelgesi bilinmemektedir.",
        ],
        confidence: qualificationReasons.length >= 2 ? 75 : 60,
      },
      meta: buildMeta("mock", true, startedAt),
    };
  }

  private buildSubject(
    channel: string,
    messageType: string,
    isEnglish: boolean,
    roleTitle: string,
    companyName: string,
    productName: string,
  ): string | null {
    if (channel === "linkedin_connection" || channel === "linkedin_message") {
      return null;
    }

    if (channel === "email") {
      if (messageType === "meeting_request") {
        return isEnglish
          ? `Quick chat about ${roleTitle} at ${companyName}`
          : `${companyName} - ${roleTitle} ile gorusme talebi`;
      }
      if (messageType === "follow_up") {
        return isEnglish
          ? `Following up: ${productName} and ${companyName}`
          : `${productName} ve ${companyName} - Takip`;
      }
      return isEnglish
        ? `${productName} for ${roleTitle} at ${companyName}`
        : `${companyName} icin ${productName}`;
    }

    if (channel === "follow_up") {
      return isEnglish
        ? `Re: ${productName} and ${companyName}`
        : `Konu: ${productName} ve ${companyName}`;
    }

    return null;
  }

  private buildBody(
    channel: string,
    messageType: string,
    language: string,
    tone: string,
    length: string,
    companyName: string,
    industry: string,
    roleTitle: string,
    buyingRole: string,
    painPoint: string,
    angle: string,
    productName: string,
    countryName: string,
    objective: string,
    qualifier: string,
  ): string {
    const isEnglish = language === "en";

    const toneOpeners: Record<string, Record<string, string>> = {
      professional: {
        en: `I hope this message finds you well. I'm reaching out regarding ${companyName}'s work in the ${industry} space.`,
        tr: `Bu mesajin sizi iyi buldugunu umuyorum. ${companyName} firmasinin ${industry} alanindaki calismalariyla ilgili olarak sizinle iletisime geciyorum.`,
      },
      concise: {
        en: `Hi — quick note about ${companyName} and ${productName}.`,
        tr: `Merhaba — ${companyName} ve ${productName} hakkinda kisa bir not.`,
      },
      consultative: {
        en: `I've been looking at how ${companyName} approaches ${industry}, and I noticed an opportunity worth discussing.`,
        tr: `${companyName} firmasinin ${industry} alanindaki yaklasimini inceledim ve tartismaya deger bir firsat fark ettim.`,
      },
      friendly: {
        en: `Hi there! I came across ${companyName}'s work in ${industry} and was genuinely interested.`,
        tr: `Merhaba! ${companyName} firmasinin ${industry} alanindaki calismalarini gordum ve gercekten ilgimi cekti.`,
      },
      direct: {
        en: `I'm writing to you because ${companyName} aligns well with what ${productName} offers.`,
        tr: `${companyName} firmasi ${productName} urununun sunduklariyla iyi uyum sagladigi icin size yaziyorum.`,
      },
    };

    const opener =
      (toneOpeners[tone]?.[language] as string | undefined) ??
      toneOpeners["professional"]?.[language] ??
      "";

    const bodyParagraphs: string[] = [];
    bodyParagraphs.push(opener);

    const roleLine = isEnglish
      ? `Based on your ${roleTitle} role and responsibilities in ${buyingRole}, teams in your position often look for ways to address ${painPoint}.`
      : `${roleTitle} rolu ve ${buyingRole} alanindaki sorumluluklariniz goz onune alindiginda, sizin konumunuzdaki ekipler genellikle ${painPoint} sorununu cozmeye calisir.`;
    bodyParagraphs.push(roleLine);

    const solutionLine = isEnglish
      ? `${productName} was designed to help teams like yours by focusing on ${angle}, and it has been particularly relevant for companies in the ${industry} sector operating in markets like ${countryName}.`
      : `${productName}, ${angle} konusuna odaklanarak sizin gibi ekiplere yardimci olmak uzere tasarlanmistir ve ozellikle ${countryName} gibi pazarlarda faaliyet gosteren ${industry} sektorundeki sirketler icin uygundur.`;
    bodyParagraphs.push(solutionLine);

    const evidenceLine = isEnglish
      ? `This may be relevant if you are currently addressing ${objective}. ${qualifier} suggests a strong foundation for exploring this further.`
      : `Su anda ${objective} konusunu ele aliyorsaniz, bu sizin icin uygun olabilir. ${qualifier}, bunu daha fazla arastirmak icin guclu bir temel oldugunu gostermektedir.`;
    bodyParagraphs.push(evidenceLine);

    if (messageType === "meeting_request") {
      const meetingLine = isEnglish
        ? `I would welcome a brief 15-minute call to explore whether this direction is valuable for ${companyName}.`
        : `${companyName} icin bu yonun degerli olup olmadigini degerlendirmek uzere kisa bir 15 dakikalik gorusme yapmaktan memnuniyet duyarim.`;
      bodyParagraphs.push(meetingLine);
    }

    if (messageType === "follow_up") {
      const followUpLine = isEnglish
        ? `Following up on our earlier conversation — I wanted to share additional context on how ${productName} could support ${companyName}'s objectives.`
        : `Onceki gorusmemizin devami olarak, ${productName} urununun ${companyName} hedeflerini nasil destekleyebilecegine dair ek bilgi paylasmak istedim.`;
      bodyParagraphs.push(followUpLine);
    }

    if (messageType === "re_engagement") {
      const reengageLine = isEnglish
        ? `Reconnecting because market conditions in ${countryName} may have shifted — and ${productName} has evolved to meet these new dynamics.`
        : `${countryName} piyasa kosullari degismis olabilecegi ve ${productName} bu yeni dinamiklere uyum saglayacak sekilde gelistigi icin yeniden baglanti kuruyorum.`;
      bodyParagraphs.push(reengageLine);
    }

    const closingLine = isEnglish
      ? `I look forward to hearing your thoughts.`
      : `Dusuncelerinizi duymaktan memnuniyet duyarim.`;
    bodyParagraphs.push(closingLine);

    let fullBody = bodyParagraphs.join("\n\n");

    if (channel === "linkedin_connection") {
      fullBody = isEnglish
        ? `I work with ${buyingRole} leaders at companies like ${companyName} in the ${industry} space, particularly around ${painPoint}. I'd value connecting.`
        : `${industry} alaninda ${companyName} gibi firmalardaki ${buyingRole} liderleriyle ozellikle ${painPoint} konusunda calisiyorum. Baglanti kurmaktan memnuniyet duyarim.`;
    }

    if (channel === "linkedin_message") {
      const preamble = isEnglish
        ? `Thanks for connecting. I noticed ${companyName}'s work in ${industry} — ${qualifier}.`
        : `Baglanti icin tesekkurler. ${companyName} firmasinin ${industry} alanindaki calismalarini fark ettim - ${qualifier}.`;
      fullBody = `${preamble}\n\n${bodyParagraphs[1]}\n\n${bodyParagraphs[2]}\n\n${closingLine}`;
    }

    if (length === "short") {
      fullBody = bodyParagraphs.slice(0, 2).join("\n\n") + `\n\n${closingLine}`;
    }

    return fullBody;
  }

  private buildCallToAction(
    channel: string,
    messageType: string,
    isEnglish: boolean,
  ): string | null {
    if (messageType === "meeting_request") {
      return isEnglish
        ? "Would a 15-minute call next week work for you?"
        : "Onumuzdeki hafta 15 dakikalik bir gorusme sizin icin uygun olur mu?";
    }
    if (messageType === "connection_request") {
      return null;
    }
    if (channel === "linkedin_connection") {
      return null;
    }
    return isEnglish
      ? "Would you be open to a quick conversation?"
      : "Kisa bir gorusme yapmaya acik olur musunuz?";
  }
}
