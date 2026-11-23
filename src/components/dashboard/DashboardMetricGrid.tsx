import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Rise } from "../ui/AuthUi";

type Props = {
  children: React.ReactNode;
};

/** Lays out dashboard metric tiles two per row. */
export default function DashboardMetricGrid({ children }: Props) {
  const styles = useMemo(() => makeStyles(), []);
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.grid}>
      {items.map((child, index) => (
        <Rise key={index} delay={120 + index * 80} style={styles.cell}>
          {child}
        </Rise>
      ))}
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    cell: {
      width: "48.5%",
      marginBottom: 12,
    },
  });
}
