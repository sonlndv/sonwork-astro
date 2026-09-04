---
title: 'Trust profits accrue to data registries, not verification vendors'
dek: 'The digital trust layer runs from state credential issuance through wallets, proofing vendors, attribute registries, runtime authentication, and relying-party access chokepoints.'
date: 2026-09-03
type: industry
author: fred
lang: en
public: false
revision: 1
sources:
  - 'https://www.sec.gov/Archives/edgar/data/929869/000092986926000008/relx-20260201xex99d1.htm'
  - 'https://investor.equifax.com/news-events/press-releases/detail/1391/equifax-delivers-fourth-quarter-2025-revenue-growth-of-9'
  - 'https://ir.clearme.com/sec-filings/all-sec-filings/content/0001628280-26-030937/you-20260331.htm'
  - 'https://ir.clearme.com/news-events/press-releases/detail/177/clear-announces-fourth-quarter-and-full-year-2025-financial'
  - 'https://pages.nist.gov/frvt/html/frvt11.html'
  - 'https://www.ofcom.org.uk/online-safety/protecting-children/enforcement-programme-to-protect-children-from-encountering-pornographic-content-through-the-use-of-age-assurance'
  - 'https://sam.gov/workspace/contract/opp/ef08c01aac7742fa887cc5a59748e265/view'
  - 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2141878'
  - 'https://fidoalliance.org/fido-alliance-reports-accelerating-global-passkey-adoption-on-world-passkey-day-2026'
  - 'https://www.entrust.com/company/newsroom/deepfakes-social-engineering-and-injection-attacks-on-the-rise'
  - 'https://investor.okta.com/financials/quarterly-results/default.aspx'
  - 'https://www.prnewswire.com/news-releases/persona-raises-200m-at-2b-valuation-to-build-the-verified-identity-layer-for-an-agentic-ai-world-302442649.html'
  - 'https://credenceid.com/resources/blog/us-mobile-drivers-license-mdl-state-tracker'
  - 'https://www.aamva.org/identity/mobile-driver-license-digital-trust-service'
  - 'https://www.bbc.com/news/articles/cgkz3m3re1zo'
tags:
  - trust-layer
  - identity
  - verification
---
The digital trust layer runs from state credential issuance through wallets, proofing vendors, attribute registries, runtime authentication, and relying-party access chokepoints. Verification itself (document + biometric checking) is the most competitive, fastest-commoditizing stage: NIST has benchmarked 1,441 face-verification algorithms since 2017, 5 billion passkeys are free at the OS layer, and 21 US states now push ISO 18013-5 mDLs that answer 'is this document genuine' without a vendor. Profit concentrates one stage upstream and one stage downstream: in non-replicable attribute databases (Equifax Workforce Solutions ~51% adjusted EBITDA margin; LexisNexis Risk 37.4% adjusted operating margin) and in owners of the place where a check must happen (airports take 14.2% of CLEAR's revenue as a revenue-share fee; ID.me holds a $1.03bn sole-source Treasury BPA).

## The numbers

- **51.3%**: Equifax Workforce Solutions adjusted EBITDA margin. Q4 2025; FY2025 segment revenue $2,582.3m (Equifax Q4 2025 release)
- **37.4%**: RELX Risk adjusted operating margin. FY2025: £1,305m profit on £3,485m revenue (RELX 2025 results, SEC EX-99.1)
- **80% / 26%**: Okta subscription gross margin / non-GAAP operating margin. FY2026, revenue $2.919bn; GAAP operating margin only 5% (Okta IR)
- **29.1%**: CLEAR adjusted EBITDA margin. FY2025 on revenue $900.8m (CLEAR FY2025 release)
- **14.2%**: Airport revenue-share fee as share of CLEAR revenue. FY2025: $127.8m of $900.8m; fee grew 25% YoY in Q1 2026 vs revenue +20%
- **1,441 from 439 developers**: Face-verification algorithms benchmarked by NIST FRTE 1:1. 2017–2026 cumulative; evidence of supplier fragmentation (NIST)

## Value chain

**01 · 1. Root credential issuance (states, UIDAI, DMVs, passport agencies)**

- What happens: Creates the legal identity and the breeder document everything else depends on; runs the biometric enrolment database
- Economics: Cost centre or fee-recovery; no commercial profit pool. UIDAI ran 2.29bn authentications in June 2025 with no vendor rent attached
- Bottleneck: Political and legal capacity, not technology; coverage gaps and document quality set the ceiling for everyone downstream

**02 · 2. Credential digitisation, wallets and trust registries (Apple/Google/Samsung Wallet, EUDI wallets, AAMVA Digital Trust Service)**

- What happens: Binds the credential to a device, distributes issuer public keys, mediates every presentation
- Economics: No disclosed per-presentation fee today (UNKNOWN). Highest option value in the chain: a distribution chokepoint that has not yet been priced
- Bottleneck: Device OS duopoly and issuer key-trust lists; eIDAS 2 forces acceptance by Dec 2027 but does not force payment

**03 · 3. Identity proofing and document/biometric verification (Entrust-Onfido, Persona, Socure, Jumio, Incode, Veriff)**

- What happens: One-time onboarding: is the document real, is the person live, is the person the document
- Economics: Per-check pricing, heavy R&D against deepfakes, venture-funded rather than cash-generative. Persona $2bn valuation on undisclosed margins; public operating margins UNKNOWN
- Bottleneck: None defensible. 1,441 NIST-benchmarked algorithms and public leaderboards make accuracy a commodity; mDLs remove the document-authenticity job entirely

**04 · 4. Attribute registries and risk analytics (Equifax Work Number, LexisNexis Risk, TransUnion, Experian)**

- What happens: Answers what a wallet cannot: income, employment, prior fraud linkage, sanctions, device and consortium history
- Economics: Best in chain. EFX Workforce Solutions ~51% adjusted EBITDA margin; RELX Risk 37.4% adjusted operating margin with +8% underlying growth
- Bottleneck: Data contribution network effects (823m payroll records from ~5m employers) plus FCRA permissible-purpose gatekeeping. Cannot be rebuilt by capital alone

**05 · 5. Runtime authentication and access management (Okta, Microsoft Entra, FIDO passkeys)**

- What happens: Recurring proof that the returning user is the same user; session and workforce access
- Economics: High gross margin (80% subscription) but thin GAAP operating margin (5% FY2026); standardisation is a price ceiling
- Bottleneck: Open standards. 5bn passkeys shipped free inside the OS layer erode the paid consumer-auth case

**06 · 6. Relying-party access and orchestration chokepoints (airport lanes, TSA PreCheck enrolment, federal portals, large-platform gateways)**

- What happens: Controls the physical or contractual place where the check must occur, and who is allowed to perform it
- Economics: Rent extraction. Airports take 14.2% of CLEAR revenue and grew that take 25% YoY; ID.me holds a $1.03bn non-competed Treasury BPA
- Bottleneck: Exclusive concessions, sole-source procurement, and regulatory accreditation: the hardest thing in the chain to buy your way into

## Profit pool

- **Attribute registries and risk analytics: 75%.** Constructed basket, not a full-industry census. RELX Risk adj. op profit £1,305m (~$1,725m at an assumed 1.32 USD/GBP) plus Equifax Workforce Solutions FY2025 revenue $2,582.3m at ~43.8% operating margin (~$1,131m, ESTIMATE from quarterly margins) = ~$2,856m of a ~$3,809m basket. Value accrues because the data is contributed, not collectible, and access is legally gated.
- **Runtime authentication and access management: 20%.** Okta FY2026 non-GAAP operating income $766m. Overstates the true position: on GAAP the figure is $149m (~4% of basket). Passkey standardisation caps future capture.
- **Consumer identity networks (proofing + lane access): 5%.** CLEAR FY2025 operating income $186.5m: and 14.2% of its revenue is already paid away to the airports that own the chokepoint, so the network operator is the junior partner in its own stage.
- **Root credential issuance (governments): %.** Public-sector cost centre by construction. Enormous volume (2.29bn Aadhaar auths/month), zero commercial profit pool, but it is the free input every profitable stage resells.
- **Wallet and trust-registry distribution: %.** UNKNOWN, currently ~zero. No per-presentation fee disclosed by Apple/Google/AAMVA/EUDI. This is the stage most likely to reprice: it holds a distribution chokepoint it has not yet monetised.
- **Identity proofing vendors (document/biometric checking): %.** UNKNOWN and probably near zero on an operating-profit basis: the leaders are private and venture-funded with undisclosed profitability. Excluded from the basket rather than assumed. This stage carries the fraud arms-race cost and the least pricing power.

## Evidence and analysis

- **Attribute-registry economics are the best in the chain: proprietary payroll records earn ~51% adjusted EBITDA margins, far above any pure verification vendor.** Equifax Workforce Solutions FY2025 revenue $2,582.3m; Q4 2025 operating margin 43.8% and adjusted EBITDA margin 51.3%. The moat is The Work Number's 823m+ employee records from ~5m employers, contributed by payroll processors, not scrapeable. FACT (financials); the record count is company-published and reported second-hand.
- **The second-best stage is risk analytics built on aggregated public + industry data: RELX Risk earned a 37.4% adjusted operating margin in 2025.** RELX 2025 results: Risk revenue £3,485m, adjusted operating profit £1,305m (1,305/3,485 = 37.4%), underlying revenue +8%, underlying profit +10%: the group's fastest-growing and highest-margin business area. FACT (primary filing, SEC EX-99.1).
- **Owning the physical or contractual chokepoint where verification must occur extracts a hard rent, and that rent is rising faster than revenue.** CLEAR Secure FY2025: revenue $900.8m, cost of revenue share fee to airport partners $127.8m = 14.2% of revenue. In Q1 2026 the fee rose 25% YoY (per-member fees +31%) versus revenue +20%: airports are capturing an increasing share. CLEAR itself ran 20.7% operating margin / 29.1% adjusted EBITDA margin in 2025. FACT (10-K and press release).
- **Document/biometric proofing is structurally the weakest stage: accuracy is a published, replicable, near-commodity benchmark with hundreds of competing suppliers.** NIST FRTE 1:1 has evaluated 1,441 algorithms from 439 unique developers since 2017 (78 algorithms in 2026 alone), with public leaderboards; top FNMR on VISABORDER is ~0.0016 at FMR=1e-6. When accuracy is public and near-ceiling, differentiation collapses to price and integration. FACT (benchmark participation counts) + INFERENCE (pricing consequence).
- **Regulation is the demand driver, and it creates mandatory check volume rather than pricing power for the checker.** UK Online Safety Act s.12 highly-effective age assurance took effect 25 July 2025; Ofcom fined Kick Online Entertainment SA £800,000 (plus £30,000) for non-compliance 25 Jul–29 Dec 2025 across 34 sites with 9m+ UK monthly visitors; Ofcom can fine up to 10% of qualifying worldwide revenue. EU Regulation 2024/1183 (eIDAS 2) obliges every member state to offer a wallet by 24 Dec 2026 and obliges private relying parties doing Strong Customer Authentication to accept it by Dec 2027. FACT (regulator and legislation).
- **Government procurement, not consumer choice, is the largest single revenue lever in Western identity proofing: and it consolidates to one vendor.** US Treasury awarded ID.me a five-year, non-competed single-award BPA worth $1,027,709,739 (ordering completion Dec 29, 2030) for identity verification and authentication; GSA separately awarded a $37.4m Login.gov Next-Gen Identity Proofing BPA involving Incode. FACT (sam.gov justification, FPDS-sourced reporting).
- **The credential-issuance stage is enormous in volume, publicly run, and captures essentially zero profit: it is the free trust root others monetize.** UIDAI recorded 229.33 crore (2.29bn) Aadhaar authentication transactions in June 2025 and 15.87 crore face authentications that month; cumulative e-KYC transactions passed 2,393 crore (23.9bn) by 30 April 2025. UIDAI is a statutory public authority, and the AAMVA mDL Digital Trust Service that distributes issuer public keys in North America is an association-run utility. FACT (PIB/UIDAI, AAMVA).
- **Runtime authentication is being standardised away: passkeys are free at the OS/wallet layer, capping the authentication stage's long-run pricing.** FIDO Alliance State of Passkeys 2026: ~5bn passkeys in active use, 90% consumer awareness, 75% have enabled one, 68% of organisations deploying for workforce. Okta still earns well (FY2026 revenue $2.919bn, 80% subscription gross margin, 26% non-GAAP operating margin) but GAAP operating margin is only 5%. FACT (FIDO, Okta filings) + INFERENCE (price ceiling).
- **Wallet/mDL distribution is a genuine emerging chokepoint but currently monetises nothing directly.** 21 US states plus Puerto Rico issue ISO/IEC 18013-5 mDLs accepted at TSA checkpoints as of Jan 2026, distributed largely through Apple/Google/Samsung Wallets; no disclosed per-presentation fee to the wallet platform was found. FACT (state tracker) + UNKNOWN (wallet monetisation).
- **Buyer power is rising and supplier power is falling in proofing, because the underlying fraud problem is being reframed as an AI arms race that every vendor claims to solve identically.** Entrust (Onfido) 2026 Identity Fraud Report: deepfakes are ~1 in 5 biometric fraud attempts, deepfaked selfies +58% in 2025, digital forgeries 35% of document fraud (up from a 29% 2022-24 average). Persona raised $200m at a $2.0bn valuation in Apr 2025 positioning as 'the verified identity layer for an agentic AI world': the same positioning competitors adopted. FACT (vendor data, funding) + INFERENCE (undifferentiated positioning implies price competition). Note vendor fraud statistics are self-reported from their own funnels, not independent.
- **ALTERNATIVE TESTED: 'EUDI wallets + mDLs + passkeys will move the profit pool to wallet/OS platforms.' Partly credible, but the evidence currently cuts the other way.** The wallet shift removes exactly one job: proving a document is genuine and bound to the presenter: which is the proofing vendors' job, not the registries'. eIDAS 2 mandates acceptance, not payment, and no wallet-platform fee is disclosed. Meanwhile demand for attributes wallets do not carry (income, employment, sanctions, prior-fraud linkage) keeps flowing to registries: Equifax Verification Services grew 14% YoY in Q1 2026 to $571.4m. INFERENCE, moderately confident; falsifiable if Apple/Google or a member-state wallet introduces per-presentation relying-party fees.
- **Third-party sizing of the 'identity verification market' is unreliable and should not be used as a profit-pool proxy.** 2025 estimates from four vendors span USD 13.75bn to 15.12bn with 2034/2035 forecasts ranging USD 37.9bn to 64.3bn (CAGR 10.9%–15.9%): a ~70% spread on the terminal value, implying inconsistent market boundaries. Treat as ASSUMPTION, not evidence. Company-level margins are the only hard data here.

## Sources

- [RELX 2025 Results Announcement (SEC EX-99.1): business area revenue and adjusted operating profit](https://www.sec.gov/Archives/edgar/data/929869/000092986926000008/relx-20260201xex99d1.htm): 2026-02-12
- [Equifax Q4 and FY2025 Results: Workforce Solutions margins and Verification Services revenue](https://investor.equifax.com/news-events/press-releases/detail/1391/equifax-delivers-fourth-quarter-2025-revenue-growth-of-9): 2026-02
- [Clear Secure Q1 2026 10-Q: revenue share fee to airport partners](https://ir.clearme.com/sec-filings/all-sec-filings/content/0001628280-26-030937/you-20260331.htm): 2026-03-31
- [CLEAR Announces Fourth Quarter and Full Year 2025 Financial Results](https://ir.clearme.com/news-events/press-releases/detail/177/clear-announces-fourth-quarter-and-full-year-2025-financial): 2026-02-25
- [NIST FRTE 1:1 Verification: participation statistics and accuracy leaderboard](https://pages.nist.gov/frvt/html/frvt11.html): 2026-07-30
- [Ofcom: Enforcement programme on age assurance; Kick Online £800,000 penalty](https://www.ofcom.org.uk/online-safety/protecting-children/enforcement-programme-to-protect-children-from-encountering-pornographic-content-through-the-use-of-age-assurance): 2026
- [sam.gov: ID.me Sole Source Justification, US Treasury IAM BPA ($1.028bn)](https://sam.gov/workspace/contract/opp/ef08c01aac7742fa887cc5a59748e265/view): 2026-01-07
- [PIB / UIDAI: 229.33 crore Aadhaar authentications in June 2025](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2141878): 2025-07
- [FIDO Alliance: State of Passkeys 2026 (5bn passkeys in use)](https://fidoalliance.org/fido-alliance-reports-accelerating-global-passkey-adoption-on-world-passkey-day-2026): 2026-05-07
- [Entrust: 2026 Identity Fraud Report (deepfakes, digital document forgery mix)](https://www.entrust.com/company/newsroom/deepfakes-social-engineering-and-injection-attacks-on-the-rise): 2025-11-18
- [Okta Inc.: quarterly and full-year financials (FY2026 revenue, gross and operating margin)](https://investor.okta.com/financials/quarterly-results/default.aspx): 2026
- [Persona raises $200M at $2B valuation (Series D)](https://www.prnewswire.com/news-releases/persona-raises-200m-at-2b-valuation-to-build-the-verified-identity-layer-for-an-agentic-ai-world-302442649.html): 2025-04-30
- [US mDL state tracker: 21 states + Puerto Rico issuing ISO 18013-5 mDLs](https://credenceid.com/resources/blog/us-mobile-drivers-license-mdl-state-tracker): 2026-01
- [AAMVA: mDL Digital Trust Service (issuer public key distribution)](https://www.aamva.org/identity/mobile-driver-license-digital-trust-service): 2026
- [BBC: Pornhub UK visitors down 77% since age checks; Ofcom reports ~1/3 fall in adult site visits](https://www.bbc.com/news/articles/cgkz3m3re1zo): 2025-11
