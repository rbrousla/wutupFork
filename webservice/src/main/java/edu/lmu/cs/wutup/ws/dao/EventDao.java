package edu.lmu.cs.wutup.ws.dao;

import java.util.List;

import edu.lmu.cs.wutup.ws.model.Event;
import edu.lmu.cs.wutup.ws.model.PaginationData;

public interface EventDao extends CommentDao {

    int createEvent(Event e);

    Event findEventById(int id);

    List<Event> findEvents(PaginationData pagination);

    void updateEvent(Event e);

    void deleteEvent(int id);

    int findNumberOfEvents();

}
