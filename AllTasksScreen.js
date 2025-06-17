import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import TaskList from './TaskList';
import { useAuth } from './AuthContext';

const AllTasksScreen = () => {
  const { user } = useAuth();
  const [searchText, setSearchText] = useState('');

  return (
    <View style={styles.container}>
      <TaskList 
        user={user} 
        filter="all"
        searchText={searchText}
        onSearchTextChange={setSearchText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default AllTasksScreen; 