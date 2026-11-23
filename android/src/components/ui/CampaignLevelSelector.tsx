import React from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { COLORS } from "../../constants/theme";
import { LEVEL_REGISTRY } from "../../constants/levels";
import { VISIBLE_CAMPAIGN_LEVELS } from "../../registries/campaignLevels";

interface CampaignLevelSelectorProps {
  currentLevelId: string;
  onSelectLevel: (levelId: string) => void;
  highestUnlocked: number;
  completedLevelIds: string[];
  disabled?: boolean;
  compact?: boolean;
}

export function CampaignLevelSelector({
  currentLevelId,
  onSelectLevel,
  highestUnlocked,
  completedLevelIds,
  disabled = false,
  compact = false,
}: CampaignLevelSelectorProps) {
  const selected = VISIBLE_CAMPAIGN_LEVELS.find((l) => l.id === currentLevelId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CAMPAIGN</Text>

      <View style={styles.scrollWrapper}>
        <ScrollView
          style={styles.verticalList}
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {VISIBLE_CAMPAIGN_LEVELS.map((level) => {
            const isSelected = level.id === currentLevelId;
            const isLocked = level.campaignNumber > highestUnlocked;
            const isCompleted = completedLevelIds.includes(level.id);
            const canSelect = !disabled && !isLocked;

            const featureTag =
              level.campaignNumber === 0
                ? "🎓 Tutorial"
                : level.campaignNumber <= 3
                  ? "📦 Classic"
                  : level.campaignNumber <= 5
                    ? "▫️ Twins"
                    : "🔷 Shapes";

            const botName = LEVEL_REGISTRY[level.botDifficulty]?.name ?? "Bot";

            return (
              <Pressable
                key={level.id}
                style={[
                  styles.levelCard,
                  compact && styles.levelCardCompact,
                  isSelected && canSelect && styles.levelCardSelected,
                  (disabled || isLocked) && styles.levelCardDisabled,
                  isLocked && styles.levelCardLocked,
                ]}
                onPress={() => canSelect && onSelectLevel(level.id)}
                disabled={!canSelect}
              >
                <View style={styles.levelCardHeader}>
                  <View style={styles.levelTitleRow}>
                    <Text style={styles.stageNumber}>
                      {isLocked ? "🔒" : isCompleted ? "✓" : level.campaignNumber === 0 ? "🎓" : level.campaignNumber}
                    </Text>
                    <Text
                      style={[
                        styles.levelName,
                        isSelected && canSelect && styles.levelNameSelected,
                        isLocked && styles.levelNameLocked,
                      ]}
                    >
                      {level.name}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.featureBadge,
                      isSelected && canSelect && styles.featureBadgeSelected,
                    ]}
                  >
                    <Text style={styles.featureText}>{featureTag}</Text>
                  </View>
                </View>
                <Text style={styles.levelGrid}>
                  {level.rows}×{level.cols} · {botName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {selected && !compact && selected.campaignNumber <= highestUnlocked && (
        <View style={styles.descBox}>
          <Text style={styles.descText}>{selected.description}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  title: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: "center",
  },
  scrollWrapper: {
    height: 185,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    backgroundColor: COLORS.glassBg,
    padding: 6,
  },
  verticalList: {
    flex: 1,
  },
  scrollContent: {
    gap: 6,
    paddingRight: 4,
  },
  levelCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    width: "100%",
  },
  levelCardCompact: {
    paddingVertical: 8,
  },
  levelCardSelected: {
    borderColor: COLORS.player1,
    backgroundColor: COLORS.player1BgSubtle,
  },
  levelCardDisabled: {
    opacity: 0.85,
  },
  levelCardLocked: {
    opacity: 0.45,
  },
  levelCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  levelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  stageNumber: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.accentGold,
    width: 18,
    textAlign: "center",
  },
  levelName: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textMuted,
    flex: 1,
  },
  levelNameSelected: {
    color: COLORS.player1Light,
  },
  levelNameLocked: {
    color: COLORS.textMuted,
  },
  featureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceMuted,
  },
  featureBadgeSelected: {
    backgroundColor: COLORS.player1BgStrong,
  },
  featureText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textMuted,
  },
  levelGrid: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.textMuted,
    opacity: 0.7,
    marginLeft: 26,
  },
  descBox: {
    marginTop: 8,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  descText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 16,
  },
});
