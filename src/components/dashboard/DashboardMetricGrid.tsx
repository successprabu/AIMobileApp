import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

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
        <View key={index} style={styles.cell}>
          {child}
        </View>
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
