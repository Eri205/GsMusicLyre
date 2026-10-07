package com.eri.gsmusiclyre.model;

import java.util.List;

public class Song {
    private final String id;
    private final String title;
    private final String category;
    private final int bpm;
    private final double duration;
    private final List<NoteEvent> events;

    public Song(String id, String title, String category, int bpm, double duration, List<NoteEvent> events) {
        this.id = id;
        this.title = title;
        this.category = category;
        this.bpm = bpm;
        this.duration = duration;
        this.events = events;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getCategory() { return category; }
    public int getBpm() { return bpm; }
    public double getDuration() { return duration; }
    public List<NoteEvent> getEvents() { return events; }

    public int getNoteCount() {
        int count = 0;
        if (events != null) {
            for (NoteEvent e : events) {
                if (e.getNotes() != null) {
                    count += e.getNotes().size();
                }
            }
        }
        return count;
    }
}
