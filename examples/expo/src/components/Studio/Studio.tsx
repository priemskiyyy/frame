import type React from "react";
import type { PublicationOutcome } from "@priemskiyyy/frame";
import { StatusBar } from "expo-status-bar";
import type { Dispatch } from "react";
import { ScrollView } from "react-native";

import { AccountCard } from "src/components/AccountCard/AccountCard";
import { BurstCard } from "src/components/BurstCard/BurstCard";
import { DuplicateCard } from "src/components/DuplicateCard/DuplicateCard";
import { EventLogCard } from "src/components/EventLogCard/EventLogCard";
import { FaultCard } from "src/components/FaultCard/FaultCard";
import { Footer } from "src/components/Footer/Footer";
import { Header } from "src/components/Header/Header";
import { Hero } from "src/components/Hero/Hero";
import { LatestOutcomeBar } from "src/components/LatestOutcomeBar/LatestOutcomeBar";
import { LedgerCard } from "src/components/LedgerCard/LedgerCard";
import { NativeCard } from "src/components/NativeCard/NativeCard";
import { OutcomeLegend } from "src/components/OutcomeLegend/OutcomeLegend";
import { ProviderCard } from "src/components/ProviderCard/ProviderCard";
import { PublishCard } from "src/components/PublishCard/PublishCard";
import { Screen } from "src/components/Screen/Screen";
import { Section } from "src/components/Section/Section";
import { TimelineCard } from "src/components/TimelineCard/TimelineCard";
import { ValidationCard } from "src/components/ValidationCard/ValidationCard";
import type { ApplicationAction } from "src/state/ApplicationAction";
import type { AccountId } from "src/types/AccountId";
import type { Provider } from "src/types/Provider";
import type { Streak } from "src/types/Streak";
import { OUTCOME_LABELS, OUTCOME_TONES } from "src/utils/constants/outcomes";
import { explainOutcome } from "src/utils/explainOutcome";
import { notifyOutcome } from "src/utils/notifyOutcome";
import type { ApplicationState } from "src/state/ApplicationState";

type StudioProps = {
  state: ApplicationState;
  act: Dispatch<ApplicationAction>;
};

export const Studio: React.FunctionComponent<StudioProps> = ({
  state,
  act,
}) => {
  const streak = state.streaks[state.account];

  // The provider is read when the press happens: an answer that lands after a switch is still that provider's.
  const handleOutcome = (label: string, outcome: PublicationOutcome) => {
    notifyOutcome(
      OUTCOME_TONES[outcome.status],
      `${label}: ${OUTCOME_LABELS[outcome.status]}. ${explainOutcome(outcome)}`,
    );
    act({
      type: "OUTCOME_RECORDED",
      label,
      provider: state.provider,
      outcome,
      at: Date.now(),
    });
  };

  const handleProviderSelect = (provider: Provider) => {
    act({ type: "PROVIDER_SELECTED", provider });
  };

  const handleStreakChange = (next: Streak) => {
    act({ type: "STREAK_EDITED", streak: next });
  };

  const handleAccountSelect = (account: AccountId) => {
    act({ type: "ACCOUNT_SELECTED", account });
  };

  const handleLedgerClear = () => {
    act({ type: "LEDGER_CLEARED" });
  };

  return (
    <>
      <StatusBar style="auto" />
      <Screen className="flex-1 bg-zinc-50 dark:bg-zinc-950">
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-6 p-4 pb-12"
        >
          <Header />
          <Hero milestones={state.milestones} />
          <Section
            title="1. Publish"
            hint="Edit the streak, press Publish, then add the Habit streak widget from the home screen gallery."
          >
            <ProviderCard
              provider={state.provider}
              onProviderSelect={handleProviderSelect}
            />
            <PublishCard
              account={state.account}
              streak={streak}
              onStreakChange={handleStreakChange}
              onOutcome={handleOutcome}
            />
          </Section>
          <Section
            title="2. Break it"
            hint="Send bad JSON, a burst of updates, or the same data twice, and read the outcomes."
          >
            <ValidationCard onOutcome={handleOutcome} />
            <BurstCard streak={streak} onOutcome={handleOutcome} />
            <DuplicateCard streak={streak} onOutcome={handleOutcome} />
            <FaultCard
              provider={state.provider}
              streak={streak}
              onOutcome={handleOutcome}
            />
          </Section>
          <Section
            title="3. Look beyond the next second"
            hint="Schedule three days, close the app, and on the Home screen provider watch the widget move on its own."
          >
            <TimelineCard streak={streak} onOutcome={handleOutcome} />
            <NativeCard
              key={`${state.provider}:${state.account}`}
              provider={state.provider}
            />
            <AccountCard
              key={state.provider}
              account={state.account}
              provider={state.provider}
              streaks={state.streaks}
              onAccountSelect={handleAccountSelect}
              onOutcome={handleOutcome}
            />
          </Section>
          <Section
            title="4. Read what happened"
            hint="Every request is in the ledger, and every step Frame took is in the event log."
          >
            <LedgerCard
              ledger={state.ledger}
              onClearPress={handleLedgerClear}
            />
            <OutcomeLegend />
            <EventLogCard provider={state.provider} />
          </Section>
          <Footer />
        </ScrollView>
        <LatestOutcomeBar entry={state.ledger[0] ?? null} />
      </Screen>
    </>
  );
};
